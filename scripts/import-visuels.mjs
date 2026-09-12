#!/usr/bin/env node
/**
 * Envoie les visuels « avant » et « apres » d'un lot de commandes vers le
 * bucket prompt-media, puis enregistre les lignes correspondantes.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/import-visuels.mjs data/visuels/v5-avant-apres.json ~/images
 *
 * Le second argument est le dossier qui contient les fichiers aux chemins
 * annonces par le releve (« avant/... », « apres/... »).
 *
 * Aucune dependance : le script parle directement aux interfaces REST de
 * Supabase avec le `fetch` de Node. C'est voulu — il est lance a la main,
 * souvent depuis une machine ou le depot n'est pas installe, et « il manque
 * un paquet » est une facon stupide d'echouer a mi-parcours.
 *
 * La cle de service ne vit que dans l'environnement de la personne qui lance
 * le script : elle n'est ni lue depuis un fichier, ni ecrite, ni affichee.
 * C'est aussi pour cela qu'il ne tourne pas dans l'integration continue — un
 * import de visuels se decide, il ne se declenche pas.
 *
 * Trois regles qui ne se negocient pas :
 *
 * 1. Rien n'est ecrase. Une commande qui porte deja un visuel du meme type
 *    est laissee telle quelle : les images deposees depuis l'administration
 *    restent celles qui s'affichent. Le script le dit et passe.
 * 2. Chaque commande recoit sa propre copie des octets, meme quand le
 *    releve donne la meme image « avant » a toute une famille. Supprimer ou
 *    remplacer un visuel efface le fichier du stockage : un chemin partage
 *    ferait disparaitre l'image de cinquante autres fiches.
 * 3. Un fichier manquant arrete le script avant le moindre envoi. Mieux vaut
 *    ne rien importer qu'importer a moitie.
 */

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

const [fichierReleve, dossierImages] = process.argv.slice(2);
if (!fichierReleve || !dossierImages) {
  console.error('Usage : import-visuels.mjs <releve.json> <dossier-images>');
  process.exit(1);
}

const base = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(
  /\/+$/,
  '',
);
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !cle) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent etre dans l environnement.');
  process.exit(1);
}

const entetes = { apikey: cle, Authorization: `Bearer ${cle}` };

/** Lit une table par l'interface REST, en tranches pour ne pas allonger l'URL. */
async function lireParLots(table, colonnes, champ, valeurs, taille = 100) {
  const lignes = [];
  for (let i = 0; i < valeurs.length; i += taille) {
    const tranche = valeurs.slice(i, i + taille);
    const url = `${base}/rest/v1/${table}?select=${colonnes}&${champ}=in.(${tranche.join(',')})`;
    const reponse = await fetch(url, { headers: entetes });
    if (!reponse.ok) throw new Error(`${table} : ${reponse.status} ${await reponse.text()}`);
    lignes.push(...(await reponse.json()));
  }
  return lignes;
}

const releve = JSON.parse(readFileSync(fichierReleve, 'utf8'));
const entrees = releve.entrees;
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

const distincts = new Set(entrees.flatMap((e) => [e.avant, e.apres])).size;
console.log(`${entrees.length} commandes, ${distincts} fichiers distincts. Rien ne manque.`);

// --- Resolution des commandes ---------------------------------------------
// Le rapprochement se fait sur la reference externe, stable, et la commande
// sert de controle : une reference qui aurait glisse ne doit pas ecrire dans
// la mauvaise fiche.

let prompts;
try {
  prompts = await lireParLots(
    'prompts',
    'id,command,external_ref',
    'external_ref',
    entrees.map((e) => e.external_ref),
  );
} catch (erreur) {
  console.error('Lecture des commandes impossible :', erreur.message);
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
      `Desaccord : ${d.external_ref} porte ${parRef.get(d.external_ref).command}, le releve dit ${d.command}`,
    );
  }
  process.exit(1);
}

// --- Ce qui est deja la ----------------------------------------------------

let dejaLa;
try {
  dejaLa = await lireParLots(
    'prompt_media',
    'prompt_id,kind',
    'prompt_id',
    [...parRef.values()].map((p) => p.id),
  );
} catch (erreur) {
  console.error('Lecture des visuels existants impossible :', erreur.message);
  process.exit(1);
}

const occupe = new Set(dejaLa.map((m) => `${m.prompt_id}:${m.kind}`));

// --- Envoi -----------------------------------------------------------------

let envoyes = 0;
let conserves = 0;
const echecs = [];

for (const [index, e] of entrees.entries()) {
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

    const envoi = await fetch(`${base}/storage/v1/object/${BUCKET}/${cible}`, {
      method: 'POST',
      headers: { ...entetes, 'Content-Type': type, 'x-upsert': 'false' },
      body: readFileSync(complet),
    });

    if (!envoi.ok) {
      echecs.push(`${e.command} ${kind} : envoi ${envoi.status} ${await envoi.text()}`);
      continue;
    }

    const ligne = await fetch(`${base}/rest/v1/prompt_media`, {
      method: 'POST',
      headers: { ...entetes, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        prompt_id: prompt.id,
        kind,
        storage_path: cible,
        alt:
          kind === 'before'
            ? `Image de depart utilisee pour ${e.command}`
            : `Resultat obtenu avec ${e.command}`,
      }),
    });

    if (!ligne.ok) {
      // La ligne n'a pas pu etre ecrite : le fichier envoye ne sert plus a
      // rien et n'a aucune raison de rester dans le stockage.
      await fetch(`${base}/storage/v1/object/${BUCKET}/${cible}`, {
        method: 'DELETE',
        headers: entetes,
      }).catch(() => {});
      echecs.push(`${e.command} ${kind} : ecriture ${ligne.status} ${await ligne.text()}`);
      continue;
    }

    envoyes += 1;
  }

  if ((index + 1) % 25 === 0) {
    console.log(`  ${index + 1}/${entrees.length} commandes traitees`);
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
