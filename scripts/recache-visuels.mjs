#!/usr/bin/env node
/**
 * Repose l'en-tete de cache des visuels deja deposes dans prompt-media.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/recache-visuels.mjs [--apercu]
 *
 * Le script d'import a longtemps envoye les fichiers sans en-tete de cache.
 * Le stockage les marque alors « no-cache » : le navigateur retelecharge la
 * vignette a chaque remontee dans la grille, et le redimensionnement est
 * refait a chaque fois. Les visuels deposes depuis l'administration, eux,
 * portent « public, max-age=3600 ».
 *
 * Le stockage ne sait pas changer l'en-tete d'un objet sans en renvoyer les
 * octets. Ceux-ci ne sont plus dans le depot — ils n'y transitent que le
 * temps d'un import. Ce script va donc les rechercher la ou ils sont : dans
 * le stockage lui-meme. Il telecharge chaque objet et le repose au meme
 * chemin, octet pour octet, avec le bon en-tete.
 *
 * Aucune dependance, comme le script d'import : il est lance par un workflow
 * et « il manque un paquet » est une facon stupide d'echouer a mi-parcours.
 *
 * Quatre regles qui ne se negocient pas :
 *
 * 1. Les octets ne changent jamais. Ce qui est telecharge est repose tel
 *    quel ; la taille est comparee avant et apres, et une divergence arrete
 *    tout. Aucune image du site n'est retouchee, remplacee ni recompressee.
 * 2. Un objet qui porte deja une duree de cache est laisse tranquille. Cela
 *    couvre les visuels deposes depuis l'administration : le script ne les
 *    touche pas, meme pour les reecrire a l'identique.
 * 3. Le chemin ne bouge pas. Les lignes de `prompt_media` continuent de
 *    pointer au meme endroit, et aucune adresse partagee ne casse. La base
 *    n'est jamais ecrite : ce script ne parle qu'au stockage.
 * 4. Un echec n'arrete pas la serie mais se compte, et le script sort en
 *    erreur s'il en reste un seul. Une correction a moitie faite qui se
 *    presente comme reussie est pire que pas de correction.
 *
 * `--apercu` ne fait que lire et compter : rien n'est envoye.
 */

const BUCKET = 'prompt-media';
const CACHE = 'public, max-age=3600';

/** Une heure de cache, en secondes : ce que l'en-tete ci-dessus annonce. */
const DUREE_ATTENDUE = 3600;

const apercu = process.argv.includes('--apercu');

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

/**
 * Lit `prompt_media` page par page.
 *
 * L'interface REST plafonne ses reponses, et un compte demande par en-tete a
 * deja menti une fois sur ce projet. On avance donc par tranches jusqu'a ce
 * qu'une tranche revienne incomplete : c'est la fin, et elle ne se devine
 * pas, elle se constate.
 */
async function lireVisuels() {
  const lignes = [];
  const taille = 1000;
  for (let debut = 0; ; debut += taille) {
    const url = `${base}/rest/v1/prompt_media?select=id,storage_path&order=id.asc&limit=${taille}&offset=${debut}`;
    const reponse = await fetch(url, { headers: entetes });
    if (!reponse.ok) throw new Error(`prompt_media : ${reponse.status} ${await reponse.text()}`);
    const page = await reponse.json();
    lignes.push(...page);
    if (page.length < taille) return lignes;
  }
}

/** « 1 fichier », « 3 fichiers » : un journal qui ne s'accorde pas se relit mal. */
function pluriel(n, singulier, plurielMot = `${singulier}s`) {
  return `${n} ${n > 1 ? plurielMot : singulier}`;
}

/** La duree de cache annoncee par le stockage, en secondes. */
function dureeAnnoncee(reponse) {
  const valeur = reponse.headers.get('cache-control') ?? '';
  const trouve = valeur.match(/max-age=(\d+)/);
  return trouve ? Number(trouve[1]) : 0;
}

let visuels;
try {
  visuels = await lireVisuels();
} catch (erreur) {
  console.error('Lecture des visuels impossible :', erreur.message);
  process.exit(1);
}

// Le meme fichier peut porter plusieurs lignes : on ne le repose qu'une fois.
const chemins = [...new Set(visuels.map((v) => v.storage_path).filter(Boolean))];
console.log(
  `${pluriel(visuels.length, 'ligne')} de visuels, ${pluriel(chemins.length, 'fichier')} distincts.`,
);

let dejaBons = 0;
let reposes = 0;
let absents = 0;
const echecs = [];

for (const [index, chemin] of chemins.entries()) {
  if (index > 0 && index % 50 === 0) {
    console.log(`  ... ${index}/${chemins.length}`);
  }

  const adresse = `${base}/storage/v1/object/${BUCKET}/${encodeURI(chemin)}`;

  let lecture;
  try {
    lecture = await fetch(adresse, { headers: entetes });
  } catch (erreur) {
    echecs.push(`${chemin} : lecture impossible (${erreur.message})`);
    continue;
  }

  if (lecture.status === 404) {
    // Une ligne qui pointe vers un fichier disparu est une anomalie a
    // signaler, pas a reparer ici : ce script ne touche pas a la base.
    absents += 1;
    continue;
  }
  if (!lecture.ok) {
    echecs.push(`${chemin} : lecture ${lecture.status}`);
    continue;
  }

  if (dureeAnnoncee(lecture) >= DUREE_ATTENDUE) {
    dejaBons += 1;
    continue;
  }

  const type = lecture.headers.get('content-type') ?? 'application/octet-stream';
  const octets = Buffer.from(await lecture.arrayBuffer());
  if (octets.length === 0) {
    echecs.push(`${chemin} : fichier vide, rien n a ete repose`);
    continue;
  }

  if (apercu) {
    reposes += 1;
    continue;
  }

  const envoi = await fetch(adresse, {
    method: 'PUT',
    headers: {
      ...entetes,
      'Content-Type': type,
      'Cache-Control': CACHE,
      'x-upsert': 'true',
    },
    body: octets,
  });

  if (!envoi.ok) {
    echecs.push(`${chemin} : envoi ${envoi.status} ${await envoi.text()}`);
    continue;
  }

  // Le controle d'apres : le fichier doit etre au meme endroit, de la meme
  // taille, et porter desormais sa duree de cache. Sans lui, un envoi accepte
  // mais tronque passerait pour une reussite.
  const apres = await fetch(adresse, { method: 'HEAD', headers: entetes });
  const taille = Number(apres.headers.get('content-length') ?? -1);
  if (!apres.ok || taille !== octets.length) {
    echecs.push(
      `${chemin} : apres envoi, ${apres.status} et ${taille} octets au lieu de ${octets.length}`,
    );
    continue;
  }
  if (dureeAnnoncee(apres) < DUREE_ATTENDUE) {
    echecs.push(`${chemin} : l en-tete de cache n a pas pris`);
    continue;
  }

  reposes += 1;
}

console.log('');
if (apercu) {
  console.log(
    `Apercu : ${pluriel(reposes, 'fichier')} a reposer, ${pluriel(dejaBons, 'fichier')} deja en cache.`,
  );
} else {
  console.log(
    `${pluriel(reposes, 'fichier')} repose${reposes > 1 ? 's' : ''}, ` +
      `${pluriel(dejaBons, 'fichier')} deja en cache.`,
  );
}
if (absents > 0) {
  console.log(
    `${pluriel(absents, 'ligne')} pointe${absents > 1 ? 'nt' : ''} vers un fichier absent du stockage.`,
  );
}

if (echecs.length > 0) {
  console.error(`\n${pluriel(echecs.length, 'echec')} :`);
  for (const e of echecs.slice(0, 40)) console.error(`  ${e}`);
  if (echecs.length > 40) console.error(`  ... et ${echecs.length - 40} autres`);
  process.exit(1);
}
