#!/usr/bin/env node
/**
 * Genere les lots SQL du catalogue V2 a partir du manifeste.
 *
 *   node scripts/generer-catalogue-v2.mjs
 *
 * Le manifeste `data/catalogue-v2/catalogue.json` est extrait du classeur de
 * migration et vit dans le depot : c'est lui qui fait foi, et le SQL genere
 * se relit a cote de lui. Regenerer produit exactement les memes fichiers —
 * aucune date, aucun identifiant tire au sort.
 *
 * Ce que les lots font, et ce qu'ils ne font pas :
 *
 * - Ils posent la taxonomie et les cartes, toutes en brouillon. Rien
 *   n'apparait a l'ecran tant que la bascule n'a pas ete appliquee.
 * - Ils ne suppriment rien et ne deplacent aucune commande hors du V2.
 * - Ils ne creent aucun payload : le catalogue V2 arrive sans texte, et
 *   `payload_ready` le dit. Les commandes reprises gardent le leur.
 *
 * Une carte dont la commande existe deja et n'est pas archivee reprend la
 * ligne existante plutot que d'en creer une seconde. C'est ce qui sauve les
 * favoris et l'historique de copie des 79 commandes que le classeur
 * conserve — et l'index unique partiel sur `command` l'exige de toute facon.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MANIFESTE = 'data/catalogue-v2/catalogue.json';
const DOSSIER = 'supabase/seed/catalogue-v2';
const PAR_LOT = 50;
const VERSION = '2.0';

const manifeste = JSON.parse(readFileSync(MANIFESTE, 'utf8'));

/** Litteral SQL, ou `null`. Les apostrophes francaises abondent ici. */
const t = (v) =>
  v === null || v === undefined || v === '' ? 'null' : `'${String(v).replaceAll("'", "''")}'`;
const b = (v) => (v ? 'true' : 'false');
const n = (v) => (v === null || v === undefined ? 'null' : String(v));
const tableau = (v) => (v && v.length ? `array[${v.map(t).join(', ')}]::text[]` : `'{}'::text[]`);

const entete = (titre, corps) =>
  [
    '-- =====================================================================',
    `-- ${titre}`,
    '--',
    ...corps.map((l) => `-- ${l}`),
    '-- =====================================================================',
    '',
  ].join('\n');

// --- Taxonomie -------------------------------------------------------------

function taxonomie() {
  const lignes = [
    entete('Catalogue V2 : les huit categories et leurs 53 collections', [
      "Deux niveaux, comme le schema le permet depuis l'origine : la",
      'categorie porte la collection. Tout arrive en brouillon et invisible —',
      'la bascule ouvre les rayons quand les cartes y sont.',
      '',
      "La cle du classeur devient le slug : c'est l'identifiant que le",
      "classeur fournit, il n'est pas renomme en chemin.",
      '',
      'Rejouable : reconnaissance par `external_ref`.',
    ]),
  ];

  for (const cat of manifeste.categories) {
    const ref = `V2-CAT-${String(cat.ordre).padStart(2, '0')}`;
    lignes.push(`-- --- ${cat.nom} (${cat.collections.length} collections) ---`);
    lignes.push(
      `insert into public.categories (external_ref, mode, slug, name, sort_order, status, is_visible, fallback_image_path)`,
    );
    lignes.push(
      `select ${t(ref)}, ${t(cat.mode)}::public.app_mode, ${t(cat.cle)}, ${t(cat.nom)}, ${n(cat.ordre)}, 'draft'::public.content_status, false, ${t(`prompt-media/families/${cat.mode}/${cat.cle}.webp`)}`,
    );
    lignes.push(
      `where not exists (select 1 from public.categories c where c.external_ref = ${t(ref)});`,
    );
    lignes.push(
      `update public.categories set slug = ${t(cat.cle)}, name = ${t(cat.nom)}, sort_order = ${n(cat.ordre)}, mode = ${t(cat.mode)}::public.app_mode, fallback_image_path = ${t(`prompt-media/families/${cat.mode}/${cat.cle}.webp`)} where external_ref = ${t(ref)};`,
    );
    lignes.push('');

    for (const col of cat.collections) {
      const refCol = `V2-COL-${String(cat.ordre).padStart(2, '0')}-${String(col.ordre).padStart(2, '0')}`;
      lignes.push(
        `insert into public.categories (external_ref, parent_id, mode, slug, name, sort_order, status, is_visible, fallback_image_path)`,
      );
      lignes.push(
        `select ${t(refCol)}, (select id from public.categories where external_ref = ${t(ref)}), ${t(cat.mode)}::public.app_mode, ${t(col.cle)}, ${t(col.nom)}, ${n(col.ordre)}, 'draft'::public.content_status, false, ${t(`prompt-media/families/${cat.mode}/${col.cle}.webp`)}`,
      );
      lignes.push(
        `where not exists (select 1 from public.categories c where c.external_ref = ${t(refCol)});`,
      );
      lignes.push(
        `update public.categories set slug = ${t(col.cle)}, name = ${t(col.nom)}, sort_order = ${n(col.ordre)}, parent_id = (select id from public.categories where external_ref = ${t(ref)}), fallback_image_path = ${t(`prompt-media/families/${cat.mode}/${col.cle}.webp`)} where external_ref = ${t(refCol)};`,
      );
    }
    lignes.push('');
  }

  const attendu =
    manifeste.categories.length +
    manifeste.categories.reduce((s, c) => s + c.collections.length, 0);
  lignes.push(`do $ctrl$`);
  lignes.push(`declare v_n integer;`);
  lignes.push(`begin`);
  lignes.push(`  select count(*) into v_n from public.categories where external_ref like 'V2-%';`);
  lignes.push(`  if v_n <> ${attendu} then`);
  lignes.push(`    raise exception 'Taxonomie V2 : % rayons au lieu de ${attendu}.', v_n;`);
  lignes.push(`  end if;`);
  lignes.push(`end $ctrl$;`);
  lignes.push('');
  return lignes.join('\n');
}

// --- Cartes ----------------------------------------------------------------

function carte(c) {
  const collection = `(select id from public.categories where slug = ${t(c.collection)})`;
  const colonnes = [
    ['external_ref', t(c.card_id)],
    ['card_id', t(c.card_id)],
    ['command', t(c.commande)],
    ['name', t(c.titre)],
    ['slug', t(c.slug)],
    ['mode', `${t(c.mode)}::public.app_mode`],
    ['category_id', collection],
    ['short_description', t(c.description)],
    ['expected_input', t(c.entree_attendue)],
    ['expected_output', t(c.sortie)],
    ['cta_label', t(c.cta)],
    ['images_min', n(c.images_min)],
    ['images_max', n(c.images_max)],
    ['witness_type', t(c.image_temoin)],
    ['default_ratio', t(c.ratio)],
    ['allow_ratio_override', b(c.ratio_modifiable)],
    ['identity_policy', t(c.identite)],
    ['text_in_image_policy', t(c.texte_image)],
    ['questionnaire_policy', t(c.questionnaire)],
    ['online_lookup_policy', t(c.recherche_en_ligne)],
    ['reality_policy', t(c.realite)],
    ['tags', tableau(c.tags)],
    ['search_keywords', tableau(c.mots_cles)],
    ['seo_title', t(c.seo_titre)],
    ['seo_description', t(c.seo_description)],
    ['priority_score', n(c.score)],
    ['sort_order', n(c.ordre)],
    ['is_featured', b(c.mise_en_avant)],
    ['show_image_card', b(c.type === 'commande_image')],
    ['catalog_version', t(VERSION)],
    ['catalog_v2', 'true'],
    ['status', `'draft'::public.content_status`],
  ];

  // Deux colonnes ne sont jamais reecrites sur une commande reprise :
  //
  // `status`, parce que la bascule decide de ce qui s'ouvre et non le lot —
  // rejouer un lot sur un catalogue publie ne doit rien refermer.
  //
  // `catalog_version` et `external_ref`, parce qu'elles disent d'ou vient la
  // commande. Trois des commandes que le classeur conserve viennent des
  // extensions V5.1 et V5.2, et l'empreinte des payloads V5 se calcule sur
  // `external_ref` : leur effacer cette origine ferait mentir les controles
  // d'import. L'appartenance au V2 se lit dans `catalog_v2`, et
  // l'identifiant du classeur dans `card_id`.
  const fige = new Set(['status', 'catalog_version', 'external_ref']);
  const maj = colonnes.filter(([k]) => !fige.has(k)).map(([k, v]) => `  ${k} = ${v}`);

  return [
    `insert into public.prompts (${colonnes.map(([k]) => k).join(', ')})`,
    `values (${colonnes.map(([, v]) => v).join(', ')})`,
    `on conflict (command) where status <> 'archived' do update set`,
    maj.join(',\n') + ';',
    '',
  ].join('\n');
}

function lots() {
  const cartes = manifeste.cartes;
  const fichiers = [];
  for (let i = 0; i < cartes.length; i += PAR_LOT) {
    const tranche = cartes.slice(i, i + PAR_LOT);
    const numero = String(Math.floor(i / PAR_LOT) + 10).padStart(3, '0');
    const corps = [
      entete(`Catalogue V2 — lot ${numero} : ${tranche.length} cartes`, [
        'Cartes en brouillon, sans payload. Une carte dont la commande existe',
        "deja et n'est pas archivee reprend sa ligne : ses favoris, son",
        'historique de copie et ses visuels restent attaches.',
        '',
        "Le statut n'est jamais reecrit ici : la bascule seule ouvre un rayon.",
      ]),
      ...tranche.map(carte),
    ].join('\n');
    fichiers.push([`${numero}_cartes.sql`, corps]);
  }
  return fichiers;
}

// --- Adresses liberees -----------------------------------------------------
//
// Le slug d'une commande active reserve son adresse. Une carte V2 peut donc
// buter sur une commande de l'ancien catalogue qui detient son slug sous un
// autre nom : `/presskit` occupait `pressrelease`, que la carte
// `/pressrelease` reclame.
//
// La regle est etroite : on n'archive que ce qui detient une adresse du
// catalogue V2 sans en porter la commande. Une commande que le classeur
// conserve garde son slug et sa ligne — la bascule s'occupe du reste.

function adresses() {
  const slugs = manifeste.cartes.map((c) => c.slug);
  return `${entete('Catalogue V2 — liberer les adresses reclamees par les cartes', [
    "Le slug d'une commande active reserve son adresse. Une carte V2 peut",
    "buter sur une commande de l'ancien catalogue qui detient son slug sous",
    'un autre nom.',
    '',
    'Seul ce cas precis est traite : la ligne detient une adresse du',
    "catalogue V2 mais n'en porte pas la commande. Une commande que le",
    'classeur conserve garde sa ligne, son slug, ses favoris et son',
    "historique — c'est la bascule qui decide du reste.",
    '',
    'Archivage, jamais suppression. Rejouable : au second passage il ne',
    'reste rien a archiver.',
  ])}
begin;

create temporary table adresses_v2 (slug text primary key) on commit drop;
insert into adresses_v2 (slug) values
${slugs.map((x) => `  (${t(x)})`).join(',\n')};

update public.prompts p
set status = 'archived'::public.content_status
where p.status <> 'archived'
  and coalesce(p.catalog_version, '') <> '${VERSION}'
  and exists (select 1 from adresses_v2 a where a.slug = p.slug)
  -- La commande d'une carte V2 est son slug precede d'une barre. Une ligne
  -- qui porte les deux est une commande que le classeur conserve.
  and p.command <> ('/' || p.slug);

commit;
`;
}

// --- Bascule ---------------------------------------------------------------
//
// La decision de publication vit ici et nulle part ailleurs : les lots
// posent les cartes, la bascule ouvre les rayons. Elle porte donc la liste
// des cartes que le classeur declare visibles — 594 sur 692.

function bascule() {
  const visibles = manifeste.cartes.filter((c) => c.visible).map((c) => c.commande);
  const total = manifeste.cartes.length;
  const rayons =
    manifeste.categories.length +
    manifeste.categories.reduce((s, c) => s + c.collections.length, 0);

  return `-- =====================================================================
-- Bascule du catalogue V2.
--
-- Les lots ont pose la taxonomie et les 692 cartes, en brouillon. Celle-ci
-- ouvre les rayons, publie les cartes que le classeur declare visibles, et
-- archive tout ce qui appartenait au catalogue precedent.
--
-- Rien n'est supprime. Les commandes et les categories d'avant passent en
-- archive : leurs lignes restent, les favoris et l'historique de copie qui
-- les designent restent valides, et republier une categorie suffit a
-- defaire le regroupement. C'est la regle du projet, et c'est de toute
-- facon la seule facon de revenir en arriere.
--
-- Les commandes que le classeur conserve ne sont pas archivees puis
-- recreees : les lots ont repris leur ligne. Elles gardent donc leur
-- identifiant, leurs favoris, leur historique et leurs visuels.
--
-- Tout tient dans une transaction, avec ses controles de sortie. Rejouable.
-- =====================================================================

begin;

-- --- Sauvegardes --------------------------------------------------------

create table if not exists public.prompts_avant_v2 as
select p.id, p.command, p.name, p.slug, p.mode, p.category_id, p.status,
       p.catalog_version, p.is_free, p.is_featured
from public.prompts p;

alter table public.prompts_avant_v2 enable row level security;
revoke all on table public.prompts_avant_v2 from anon, authenticated;

create table if not exists public.categories_avant_v2 as
select c.id, c.external_ref, c.slug, c.name, c.mode, c.parent_id, c.status, c.sort_order
from public.categories c;

alter table public.categories_avant_v2 enable row level security;
revoke all on table public.categories_avant_v2 from anon, authenticated;

-- --- Garde : le catalogue V2 doit etre la --------------------------------

do $garde$
declare
  v_rayons integer;
  v_cartes integer;
begin
  select count(*) into v_rayons from public.categories where external_ref like 'V2-%';
  if v_rayons <> ${rayons} then
    raise exception 'Bascule V2 : % rayons au lieu de ${rayons}. Appliquer d abord les lots.', v_rayons;
  end if;

  select count(*) into v_cartes from public.prompts where catalog_v2;
  if v_cartes <> ${total} then
    raise exception 'Bascule V2 : % cartes au lieu de ${total}. Appliquer d abord les lots.', v_cartes;
  end if;
end $garde$;

-- --- Publication des cartes ---------------------------------------------
--
-- Le classeur declare ${visibles.length} cartes visibles sur ${total}. Les autres restent
-- en brouillon : elles existent, elles ne s'affichent pas.

-- Par la commande, seul identifiant que partagent une carte du classeur et
-- une ligne reprise du catalogue precedent : celle-ci garde son
-- external_ref d'origine.
create temporary table cartes_visibles (command text primary key) on commit drop;
insert into cartes_visibles (command) values
${visibles.map((r) => `  (${t(r)})`).join(',\n')};

update public.prompts p
set status = 'published'::public.content_status,
    published_at = coalesce(p.published_at, now())
where p.catalog_v2
  and exists (select 1 from cartes_visibles v where v.command = p.command::text)
  and p.status <> 'published';

update public.prompts p
set status = 'draft'::public.content_status
where p.catalog_v2
  and not exists (select 1 from cartes_visibles v where v.command = p.command::text)
  and p.status = 'published';

-- --- Ouverture des rayons -------------------------------------------------
--
-- Une collection ne s'ouvre que si elle a une carte publiee, une categorie
-- que si une de ses collections s'ouvre. Un rayon vide est un cul-de-sac :
-- cinq collections du classeur n'ont aucune carte visible et restent donc
-- fermees, sans qu'il faille les nommer ici.

update public.categories c
set status = 'published'::public.content_status
where c.external_ref like 'V2-COL-%'
  and exists (
    select 1 from public.prompts p
    where p.category_id = c.id and p.status = 'published'
  );

update public.categories c
set status = 'published'::public.content_status
where c.external_ref like 'V2-CAT-%'
  and exists (
    select 1 from public.categories f
    where f.parent_id = c.id and f.status = 'published'
  );

-- --- Archivage de l'ancien catalogue --------------------------------------

-- Borne au catalogue : une commande posee a la main — un jeu de recette,
-- un essai en administration — n'a ete rangee par aucun import et n'a pas a
-- etre emportee par celui-ci. La colonne catalog_version marque un import.
update public.prompts p
set status = 'archived'::public.content_status
where not p.catalog_v2
  and p.catalog_version is not null
  and p.status <> 'archived';

update public.categories c
set status = 'archived'::public.content_status
where c.external_ref is distinct from null
  and c.external_ref not like 'V2-%'
  and c.status <> 'archived';

-- Les categories heritees des taxonomies precedentes portent toutes une
-- reference externe ou plus rien du tout. Celles qui n'en portent pas et qui
-- gardent une commande active ont ete posees a la main : on les laisse.
update public.categories c
set status = 'archived'::public.content_status
where c.external_ref is null
  and c.status <> 'archived'
  and not exists (
    select 1 from public.prompts p
    where p.category_id = c.id and p.status <> 'archived'
  );

-- --- Controles de sortie ---------------------------------------------------

do $ctrl$
declare
  v_publiees integer;
  v_hors integer;
  v_desertes integer;
  v_perdues integer;
  v_cat integer;
begin
  select count(*) into v_publiees
  from public.prompts where catalog_v2 and status = 'published';
  if v_publiees <> ${visibles.length} then
    raise exception 'Catalogue V2 : % cartes publiees au lieu de ${visibles.length}.', v_publiees;
  end if;

  -- Plus rien du catalogue precedent ne doit rester actif.
  select count(*) into v_hors
  from public.prompts
  where not catalog_v2 and catalog_version is not null and status <> 'archived';
  if v_hors > 0 then
    raise exception 'Catalogue V2 : % commandes de l ancien catalogue encore actives.', v_hors;
  end if;

  -- Aucun rayon ouvert et vide.
  select count(*) into v_desertes
  from public.categories c
  where c.is_visible
    and not exists (select 1 from public.categories f where f.parent_id = c.id and f.is_visible)
    and not exists (select 1 from public.prompts p where p.category_id = c.id and p.status = 'published');
  if v_desertes > 0 then
    raise exception 'Catalogue V2 : % rayons ouverts sans aucune carte.', v_desertes;
  end if;

  -- Aucune carte publiee hors d'un rayon visible : elle existerait sans exister.
  select count(*) into v_perdues
  from public.prompts p
  where p.status = 'published'
    and (p.category_id is null
         or not exists (select 1 from public.categories c where c.id = p.category_id and c.is_visible));
  if v_perdues > 0 then
    raise exception 'Catalogue V2 : % cartes publiees hors d un rayon visible.', v_perdues;
  end if;

  -- Rien n'a disparu : ce qui n'est plus actif est archive.
  if (select count(*) from public.prompts) < (select count(*) from public.prompts_avant_v2) then
    raise exception 'Catalogue V2 : des commandes ont disparu de la base.';
  end if;

  select count(*) into v_cat from public.categories where external_ref like 'V2-CAT-%' and is_visible;
  raise notice 'Catalogue V2 : % cartes publiees, % categories ouvertes.', v_publiees, v_cat;
end $ctrl$;

commit;
`;
}

// --- Ecriture --------------------------------------------------------------

if (existsSync(DOSSIER)) rmSync(DOSSIER, { recursive: true });
mkdirSync(DOSSIER, { recursive: true });

writeFileSync(join(DOSSIER, '000_adresses.sql'), adresses());
writeFileSync(join(DOSSIER, '001_taxonomie.sql'), taxonomie());
writeFileSync('supabase/seed/bascule-catalogue-v2.sql', bascule());
let cartes = 0;
for (const [nom, corps] of lots()) {
  writeFileSync(join(DOSSIER, nom), corps);
  cartes += (corps.match(/^insert into public\.prompts /gm) ?? []).length;
}

console.log(
  `${manifeste.categories.length} categories, ` +
    `${manifeste.categories.reduce((s, c) => s + c.collections.length, 0)} collections, ` +
    `${cartes} cartes ecrites dans ${DOSSIER}.`,
);
