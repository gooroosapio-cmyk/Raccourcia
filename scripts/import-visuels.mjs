#!/usr/bin/env node
/**
 * Envoie les visuels « avant » et « apres » d'un lot de commandes vers le
 * bucket prompt-media, puis enregistre les lignes correspondantes.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/import-visuels.mjs data/visuels/v5-avant-apres.json ~/images
 *
 * Le second argument est le dossier qui contient les fichiers aux chemins
 * annonces par le classeur (« upload/... », « generated_images/... »).
 *
 * La cle de service ne vit que dans l'environnement de la personne qui lance
 * le script : elle n'est ni lue depuis un fichier, ni ecrite, ni affichee.
 * C'est aussi pour cela que ce script ne tourne pas dans l'integration
 * continue — un import de visuels se decide, il ne se declenche pas.
 *
 * Trois regles qui ne se negocient pas :
 *
 * 1. Rien n'est ecrase. Une commande qui porte deja un visuel du meme type
 *    est laissee telle quelle : les images deposees depuis l'administration
 *    restent celles qui s'affichent. Le script le dit et passe.
 * 2. Chaque commande recoit sa propre copie des octets, meme quand le
 *    classeur donne la meme image « avant » a toute une famille. Supprimer
 *    ou remplacer un visuel efface le fichier du stockage : un chemin
 *    partage ferait disparaitre l'image de cinquante autres fiches.
 * 3. Un fichier manquant arrete le script avant le moindre envoi. Mieux vaut
 *    ne rien importer qu'importer a moitie.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const BUCKET = 'prompt-media';

/** Les memes formats que l'administration accepte, et la meme borne. */
const TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};
const POIDS_MAX = 10 * 1024 * 1024;

const [fichierMapping, dossierImages] = process.argv.slice(2);
if (!fichierMapping || !dossierImages) {
  console.error('Usage : import-visuels.mjs <mapping.json> <dossier-images>');
  process.exit(1);
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !cle) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent etre dans l environnement.');
  process.exit(1);
}

const supabase = createClient(url, cle, { auth: { persistSession: false } });
const mapping = JSON.parse(readFileSync(fichierMapping, 'utf8'));
const entrees = mapping.entrees;
const racine = resolve(dossierImages);

// --- Controle prealable ----------------------------------------------------
// Tout est verifie avant le premier envoi : chemins, formats, poids. Un lot
// qui ne peut pas aboutir n'a aucune raison de commencer.

const manquants = [];
const refuses = [];
for (const e of entrees) {
  for (const chemin of [e.avant, e.apres]) {
    const complet = join(racine, chemin);
    if (!existsSync(complet)) {
      manquants.push(chemin);
      continue;
    }
    const ext = extname(complet).toLowerCase();
    if (!TYPES[ext]) refuses.push(`${chemin} (format ${ext || 'inconnu'})`);
    else if (statSync(complet).size > POIDS_MAX) refuses.push(`${chemin} (plus de 10 Mo)`);
  }
}

if (manquants.length || refuses.length) {
  if (manquants.length) {
    console.error(`${new Set(manquants).size} fichier(s) introuvable(s) sous ${racine} :`);
    for (const m of [...new Set(manquants)].slice(0, 10)) console.error(`  ${m}`);
    if (new Set(manquants).size > 10) console.error('  ...');
  }
  if (refuses.length) {
    console.error(`${refuses.length} fichier(s) refuse(s) :`);
    for (const r of refuses.slice(0, 10)) console.error(`  ${r}`);
  }
  process.exit(1);
}

console.log(
  `${entrees.length} commandes, ${new Set(entrees.flatMap((e) => [e.avant, e.apres])).size} fichiers distincts. Rien ne manque.`,
);

// --- Resolution des commandes ---------------------------------------------
// Le rapprochement se fait sur la reference externe, stable, et la commande
// sert de controle : une reference qui aurait glisse ne doit pas ecrire dans
// la mauvaise fiche.

const refs = entrees.map((e) => e.external_ref);
const { data: prompts, error: erreurPrompts } = await supabase
  .from('prompts')
  .select('id, command, external_ref')
  .in('external_ref', refs);

if (erreurPrompts) {
  console.error('Lecture des commandes impossible :', erreurPrompts.message);
  process.exit(1);
}

const parRef = new Map(prompts.map((p) => [p.external_ref, p]));
const absentes = entrees.filter((e) => !parRef.has(e.external_ref));
const desaccords = entrees.filter((e) => {
  const p = parRef.get(e.external_ref);
  return p && p.command.toLowerCase() !== e.command.toLowerCase();
});

if (absentes.length || desaccords.length) {
  for (const a of absentes)
    console.error(`Commande absente du catalogue : ${a.external_ref} ${a.command}`);
  for (const d of desaccords) {
    console.error(
      `Desaccord : ${d.external_ref} porte ${parRef.get(d.external_ref).command}, le classeur dit ${d.command}`,
    );
  }
  process.exit(1);
}

// --- Ce qui est deja la ----------------------------------------------------

const { data: dejaLa, error: erreurMedias } = await supabase
  .from('prompt_media')
  .select('prompt_id, kind')
  .in(
    'prompt_id',
    [...parRef.values()].map((p) => p.id),
  );

if (erreurMedias) {
  console.error('Lecture des visuels existants impossible :', erreurMedias.message);
  process.exit(1);
}

const occupe = new Set(dejaLa.map((m) => `${m.prompt_id}:${m.kind}`));

// --- Envoi -----------------------------------------------------------------

let envoyes = 0;
let conserves = 0;
const echecs = [];

for (const e of entrees) {
  const prompt = parRef.get(e.external_ref);

  for (const [kind, chemin] of [
    ['before', e.avant],
    ['after', e.apres],
  ]) {
    if (occupe.has(`${prompt.id}:${kind}`)) {
      conserves += 1;
      continue;
    }

    const complet = join(racine, chemin);
    const type = TYPES[extname(complet).toLowerCase()];
    // Le chemin reprend la convention de l'administration : une fiche, un
    // type, un horodatage. Le suffixe garde les anciens fichiers hors du
    // cache CDN quand un visuel est remplace.
    const extension = type === 'image/jpeg' ? 'jpg' : type.split('/')[1];
    const cible = `prompts/${prompt.id}/${kind}-${Date.now()}.${extension}`;

    const { error: erreurEnvoi } = await supabase.storage
      .from(BUCKET)
      .upload(cible, readFileSync(complet), { contentType: type, upsert: false });

    if (erreurEnvoi) {
      echecs.push(`${e.command} ${kind} : ${erreurEnvoi.message}`);
      continue;
    }

    const { error: erreurLigne } = await supabase.from('prompt_media').insert({
      prompt_id: prompt.id,
      kind,
      storage_path: cible,
      alt:
        kind === 'before'
          ? `Image de depart utilisee pour ${e.command}`
          : `Resultat obtenu avec ${e.command}`,
    });

    if (erreurLigne) {
      // La ligne n'a pas pu etre ecrite : le fichier envoye ne sert plus a
      // rien et n'a aucune raison de rester dans le stockage.
      await supabase.storage.from(BUCKET).remove([cible]);
      echecs.push(`${e.command} ${kind} : ${erreurLigne.message}`);
      continue;
    }

    envoyes += 1;
  }

  if ((entrees.indexOf(e) + 1) % 25 === 0) {
    console.log(`  ${entrees.indexOf(e) + 1}/${entrees.length} commandes traitees`);
  }
}

console.log(
  `\n${envoyes} visuels deposes, ${conserves} laisses en place (un visuel y etait deja).`,
);
if (echecs.length) {
  console.error(`${echecs.length} echec(s) :`);
  for (const e of echecs.slice(0, 20)) console.error(`  ${e}`);
  process.exit(1);
}
