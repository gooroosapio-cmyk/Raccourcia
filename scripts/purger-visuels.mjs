#!/usr/bin/env node
/**
 * Les fichiers de l'effacement des visuels anterieurs au 18 septembre 2026.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/purger-visuels.mjs <apercu|sauvegarde|fichiers|restauration>
 *
 * Lance par le workflow Visuels, qui porte la cle : elle n'est jamais ecrite
 * ailleurs que dans les secrets GitHub. Le manifeste est
 * `data/visuels/purge-avant-18-septembre.json` — ce script ne touche QUE les
 * chemins qu'il nomme.
 *
 *   apercu        Lit et compte. N'ecrit rien.
 *   sauvegarde    Copie chaque fichier dans le compartiment prive
 *                 `prompt-media-sauvegarde`, au meme chemin. Rejouable.
 *   fichiers      Efface les fichiers du compartiment public. Refuse si un
 *                 seul chemin est encore reference par une ligne de
 *                 `prompt_media` (le lot SQL doit passer avant), ou si un
 *                 seul manque dans la sauvegarde. Rien n'est efface sans
 *                 copie verifiee.
 *   restauration  Recopie la sauvegarde dans le compartiment public. A faire
 *                 avant le lot SQL de restauration.
 */

import { readFileSync } from 'node:fs';

const PUBLIC = 'prompt-media';
const SAUVEGARDE = 'prompt-media-sauvegarde';
const tache = process.argv[2];
const TACHES = ['apercu', 'sauvegarde', 'fichiers', 'restauration'];
if (!TACHES.includes(tache)) {
  console.error(`Usage : purger-visuels.mjs <${TACHES.join('|')}>`);
  process.exit(1);
}

const base = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !cle) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent etre dans l environnement.');
  process.exit(1);
}
const auth = { apikey: cle, Authorization: `Bearer ${cle}` };

const manifeste = JSON.parse(readFileSync('data/visuels/purge-avant-18-septembre.json', 'utf8'));
const chemins = manifeste.visuels.map((v) => v.storage_path);
console.log(`Manifeste : ${chemins.length} fichiers, seuil ${manifeste.seuil}.`);

/** Le stockage limite le debit (429 observes a huit requetes simultanees). */
async function appel(url, options = {}, essais = 6) {
  for (let i = 0; i < essais; i++) {
    const r = await fetch(url, { ...options, headers: { ...auth, ...(options.headers ?? {}) } });
    if (r.status !== 429 && r.status < 500) return r;
    await new Promise((ok) => setTimeout(ok, 1000 * 2 ** i));
  }
  throw new Error(`Echec persistant : ${url}`);
}

/** Les fichiers presents dans un compartiment, dossier par dossier. */
async function presents(bucket) {
  const dossiers = [...new Set(chemins.map((c) => c.slice(0, c.lastIndexOf('/') + 1)))];
  const vus = new Set();
  for (const prefix of dossiers) {
    const r = await appel(`${base}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000 }),
    });
    if (r.status === 400 || r.status === 404) continue; // compartiment absent
    if (!r.ok) throw new Error(`Liste ${bucket}/${prefix} : ${r.status} ${await r.text()}`);
    for (const o of await r.json()) vus.add(prefix + o.name);
  }
  return new Set(chemins.filter((c) => vus.has(c)));
}

/** Les chemins encore designes par une ligne de visuel. */
async function references() {
  const refs = new Set();
  for (let i = 0; i < chemins.length; i += 80) {
    const tranche = chemins
      .slice(i, i + 80)
      .map((c) => `"${c}"`)
      .join(',');
    const r = await appel(
      `${base}/rest/v1/prompt_media?select=storage_path&storage_path=in.(${encodeURIComponent(tranche)})`,
    );
    if (!r.ok) throw new Error(`Lecture prompt_media : ${r.status} ${await r.text()}`);
    for (const l of await r.json()) refs.add(l.storage_path);
  }
  return refs;
}

async function copier(de, vers, liste) {
  let faits = 0;
  for (const c of liste) {
    const src = await appel(`${base}/storage/v1/object/authenticated/${de}/${c}`);
    if (!src.ok) throw new Error(`Lecture ${de}/${c} : ${src.status}`);
    const type = src.headers.get('content-type') ?? 'application/octet-stream';
    const octets = Buffer.from(await src.arrayBuffer());
    const dst = await appel(`${base}/storage/v1/object/${vers}/${c}`, {
      method: 'POST',
      headers: { 'Content-Type': type, 'x-upsert': 'true', 'cache-control': 'max-age=31536000' },
      body: octets,
    });
    if (!dst.ok) throw new Error(`Ecriture ${vers}/${c} : ${dst.status} ${await dst.text()}`);
    if (++faits % 100 === 0) console.log(`  ${faits}/${liste.length}`);
  }
  return faits;
}

const dansPublic = await presents(PUBLIC);
const dansSauvegarde = await presents(SAUVEGARDE);
const refs = await references();
console.log(
  `Dans ${PUBLIC} : ${dansPublic.size} | dans ${SAUVEGARDE} : ${dansSauvegarde.size} | encore references : ${refs.size}`,
);

if (tache === 'apercu') process.exit(0);

if (tache === 'sauvegarde') {
  // Compartiment prive : une sauvegarde n'a pas a etre servie au public.
  const b = await appel(`${base}/storage/v1/bucket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: SAUVEGARDE, name: SAUVEGARDE, public: false }),
  });
  if (!b.ok && b.status !== 409 && !/already exists|Duplicate/i.test(await b.text()))
    throw new Error(`Creation du compartiment : ${b.status}`);
  const aCopier = chemins.filter((c) => dansPublic.has(c) && !dansSauvegarde.has(c));
  console.log(`A copier : ${aCopier.length}`);
  await copier(PUBLIC, SAUVEGARDE, aCopier);
  const apres = await presents(SAUVEGARDE);
  const manquants = chemins.filter((c) => dansPublic.has(c) && !apres.has(c));
  if (manquants.length) throw new Error(`Sauvegarde incomplete : ${manquants.length} manquants.`);
  console.log(`Sauvegarde verifiee : ${apres.size} fichiers dans ${SAUVEGARDE}.`);
}

if (tache === 'fichiers') {
  if (refs.size) {
    console.error(`Refus : ${refs.size} chemins sont encore references. Jouer le lot SQL d'abord.`);
    process.exit(1);
  }
  const nonSauves = [...dansPublic].filter((c) => !dansSauvegarde.has(c));
  if (nonSauves.length) {
    console.error(`Refus : ${nonSauves.length} fichiers ne sont pas dans la sauvegarde.`);
    process.exit(1);
  }
  const aEffacer = [...dansPublic];
  for (let i = 0; i < aEffacer.length; i += 100) {
    const r = await appel(`${base}/storage/v1/object/${PUBLIC}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: aEffacer.slice(i, i + 100) }),
    });
    if (!r.ok) throw new Error(`Effacement : ${r.status} ${await r.text()}`);
  }
  const reste = await presents(PUBLIC);
  if (reste.size) throw new Error(`${reste.size} fichiers subsistent.`);
  console.log(`Effaces : ${aEffacer.length} fichiers. La sauvegarde reste dans ${SAUVEGARDE}.`);
}

if (tache === 'restauration') {
  const aRecopier = chemins.filter((c) => dansSauvegarde.has(c) && !dansPublic.has(c));
  console.log(`A restaurer : ${aRecopier.length}`);
  await copier(SAUVEGARDE, PUBLIC, aRecopier);
  console.log(
    'Fichiers restaures. Jouer ensuite supabase/seed/purge-visuels-avant-18-restauration.',
  );
}
