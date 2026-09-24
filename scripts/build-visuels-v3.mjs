#!/usr/bin/env node
/**
 * Genere les lots SQL d'import du catalogue Visuels V3 depuis
 * data/catalogue/visuels-v3/*.json.
 *
 *   node scripts/build-visuels-v3.mjs
 *
 * CE QUE CES LOTS GARANTISSENT, ET COMMENT.
 *
 * REJOUABLES. La clef d'upsert est `card_id`, jamais le slug. C'est le
 * point delicat de cet import : il RENOMME les slugs, puisque le slug V3
 * remplace l'ancien. Une resolution par slug marcherait au premier passage
 * et echouerait au second, qui ne retrouverait plus rien et creerait 862
 * doublons. `card_id` survit au renommage — les 765 cartes historiques s'y
 * retrouvent toutes, verifie en base.
 *
 * SANS RIEN ECRASER DE CE QUI N'EST PAS EDITORIAL. Les lots ne touchent ni
 * `status`, ni `is_free`, ni `published_at`, ni `like_count`, ni les
 * medias. Le CSV n'apporte aucune image (`medias_json` vide sur les 862) :
 * une cellule vide ne signifie jamais « supprimer ». Une carte publiee
 * reste publiee, une carte offerte reste offerte.
 *
 * VERIFIES. Chaque lot se termine par un bloc qui leve si le compte attendu
 * n'est pas atteint. Un lot qui passe est un lot verifie — c'est la lecon
 * de l'import V2, ou 99 raccourcis sur 250 n'etaient jamais arrives sans
 * que personne le voie pendant des semaines.
 *
 * LE LOT 000 N'ECRIT RIEN. Il compte ce que les suivants vont toucher et
 * l'affiche. On le passe seul, on lit, puis on decide.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'catalogue', 'visuels-v3');
const OUT = join(ROOT, 'supabase', 'seed', 'visuels-v3');

/** Delimiteur dollar-quote : evite tout echappement dans les payloads. */
const TAG = '$raccourcia$';

/** Assez petit pour qu'un echec reste lisible, assez grand pour tenir. */
const TAILLE_LOT = 50;

/** Prefixes de reference : une categorie V3 ne doit jamais ecraser une V2. */
const REF_CATEGORIE = 'V3-';
const REF_COLLECTION = 'V3C-';

const read = (nom) => JSON.parse(readFileSync(join(DATA, `${nom}.json`), 'utf8'));

const cartes = read('cartes');
const categories = read('categories');
const collections = read('collections');
const tags = read('tags');

function litteral(rows) {
  const compact = rows.map((row) =>
    Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null && v !== undefined)),
  );
  const json = JSON.stringify(compact);
  if (json.includes(TAG)) {
    throw new Error(`Le delimiteur ${TAG} apparait dans les donnees.`);
  }
  return `${TAG}${json}${TAG}`;
}

/** Le rayon d'une carte : sa collection si elle en a une, sinon sa categorie. */
const refDuRayon = (carte) =>
  carte.collection ? `${REF_COLLECTION}${carte.collection}` : `${REF_CATEGORIE}${carte.categorie}`;

const lots = [];
const ajouter = (nom, sql) => lots.push({ nom, sql });

// ---------------------------------------------------------------------------
// 000 — L'apercu. Aucune ecriture.
// ---------------------------------------------------------------------------

const tousLesIds = cartes.map((c) => c.carteId);

ajouter(
  '000_apercu.sql',
  `-- Lot 000 : ce que l'import va toucher. AUCUNE ECRITURE.
--
-- A passer seul, avant tout le reste. Il ne modifie rien : il compte, il
-- affiche, et il laisse decider. Les chiffres attendus sont ceux du
-- contrat CSV — 862 cartes, dont 765 deja en base et 97 nouvelles.

drop table if exists apercu_v3;
create temporary table apercu_v3 as
select * from jsonb_to_recordset(${litteral(cartes.map((c) => ({ id: c.carteId, origine: c.origine })))})
as x(id text, origine text);

do $ctrl$
declare
  v_total integer;
  v_historiques integer;
  v_retrouvees integer;
  v_perdues integer;
  v_nouvelles integer;
  v_deja_prises integer;
  v_hors_csv integer;
begin
  select count(*) into v_total from apercu_v3;
  select count(*) into v_historiques from apercu_v3 where origine = 'existant_revise';

  select count(*) into v_retrouvees
  from apercu_v3 a join public.prompts p on p.card_id = a.id
  where a.origine = 'existant_revise';
  v_perdues := v_historiques - v_retrouvees;

  select count(*) into v_nouvelles from apercu_v3 where origine = 'ajout_v3';
  select count(*) into v_deja_prises
  from apercu_v3 a join public.prompts p on p.card_id = a.id
  where a.origine = 'ajout_v3';

  -- Ce que le CSV ne couvre pas et qui reste publie : ces cartes partiront
  -- dans la categorie de transition plutot que de se retrouver sans rayon.
  select count(*) into v_hors_csv
  from public.prompts p
  where p.library = 'images'::public.app_library
    and p.status = 'published'::public.content_status
    and (p.card_id is null or not exists (select 1 from apercu_v3 a where a.id = p.card_id));

  raise notice 'Apercu V3 — % cartes au CSV.', v_total;
  raise notice '  mises a jour  : % retrouvees sur % historiques (% introuvables)',
    v_retrouvees, v_historiques, v_perdues;
  raise notice '  creations     : % nouvelles, dont % dont l''identifiant est deja pris',
    v_nouvelles, v_deja_prises;
  raise notice '  transition    : % cartes publiees hors CSV a reclasser', v_hors_csv;

  if v_perdues > 0 then
    raise exception 'Apercu : % cartes historiques introuvables par card_id. '
      'L''import creerait des doublons — ne pas passer les lots suivants.', v_perdues;
  end if;
end $ctrl$;

drop table apercu_v3;
`,
);

// ---------------------------------------------------------------------------
// 001 — Categories et collections.
// ---------------------------------------------------------------------------

ajouter(
  '001_categories.sql',
  `-- Lot 001 : les 12 categories V3, leur categorie de transition, et les 71
-- collections.
--
-- Les references sont prefixees (${REF_CATEGORIE} / ${REF_COLLECTION}) : une categorie V3 ne
-- doit jamais ecraser une V2 qui porterait le meme slug. Les anciennes
-- restent en place tant qu'elles portent des cartes — c'est le lot 900 qui
-- les vide, apres controle.

begin;

drop table if exists lot_cat_v3;
create temporary table lot_cat_v3 as
select * from jsonb_to_recordset(${litteral(
    categories.map((c) => ({
      ref: `${REF_CATEGORIE}${c.slug}`,
      slug: c.slug,
      nom: c.nom,
      ordre: c.ordre,
      description: c.description ?? null,
    })),
  )})
as x(ref text, slug text, nom text, ordre integer, description text);

insert into public.categories (external_ref, slug, name, mode, sort_order, short_description, status, is_visible)
select l.ref, l.slug, l.nom, 'image'::public.app_mode, l.ordre, l.description,
       'published'::public.content_status, true
from lot_cat_v3 l
on conflict (external_ref) where external_ref is not null do update
set name = excluded.name,
    sort_order = excluded.sort_order,
    short_description = coalesce(excluded.short_description, public.categories.short_description),
    is_visible = true;

drop table if exists lot_col_v3;
create temporary table lot_col_v3 as
select * from jsonb_to_recordset(${litteral(
    collections.map((c) => ({
      ref: `${REF_COLLECTION}${c.slug}`,
      slug: c.slug,
      nom: c.nom,
      parent: `${REF_CATEGORIE}${c.categorie}`,
    })),
  )})
as x(ref text, slug text, nom text, parent text);

insert into public.categories (external_ref, slug, name, mode, parent_id, status, is_visible)
select l.ref, l.slug, l.nom, 'image'::public.app_mode, p.id,
       'published'::public.content_status, true
from lot_col_v3 l
join public.categories p on p.external_ref = l.parent
on conflict (external_ref) where external_ref is not null do update
set name = excluded.name,
    parent_id = excluded.parent_id,
    is_visible = true;

do $ctrl$
declare
  v_cat integer;
  v_col integer;
begin
  select count(*) into v_cat from lot_cat_v3 l
  join public.categories c on c.external_ref = l.ref;
  select count(*) into v_col from lot_col_v3 l
  join public.categories c on c.external_ref = l.ref and c.parent_id is not null;

  if v_cat <> ${categories.length} then
    raise exception 'Lot 001 : % categories sur ${categories.length}.', v_cat;
  end if;
  if v_col <> ${collections.length} then
    raise exception 'Lot 001 : % collections sur ${collections.length}.', v_col;
  end if;
  raise notice 'Taxonomie V3 : % categories, % collections.', v_cat, v_col;
end $ctrl$;

drop table lot_cat_v3;
drop table lot_col_v3;

commit;
`,
);

// ---------------------------------------------------------------------------
// 002 — Le referentiel de tags.
// ---------------------------------------------------------------------------

ajouter(
  '002_tags.sql',
  `-- Lot 002 : les ${tags.length} tags du contrat V3, avec leur definition.
--
-- Seuls les tags REELLEMENT UTILISES sont poses : un tag sans resultat est
-- une porte qui ouvre sur une piece vide. Les 28 deja en base sont mis a
-- jour, les 48 autres crees. Aucun n'est desactive ici — un tag V2 encore
-- porte par des cartes ecrites continue de servir.

begin;

drop table if exists lot_tags_v3;
create temporary table lot_tags_v3 as
select * from jsonb_to_recordset(${litteral(
    tags.map((t, i) => ({ slug: t.slug, nom: t.nom, definition: t.definition, ordre: i + 1 })),
  )})
as x(slug text, nom text, definition text, ordre integer);

insert into public.tags (slug, name, groupe, description, is_active, sort_order)
select l.slug, l.nom, 'style'::public.tag_group, l.definition, true, l.ordre
from lot_tags_v3 l
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    is_active = true;

do $ctrl$
declare
  v_poses integer;
  v_sans_definition integer;
begin
  select count(*) into v_poses from lot_tags_v3 l join public.tags t on t.slug = l.slug;
  select count(*) into v_sans_definition
  from lot_tags_v3 l join public.tags t on t.slug = l.slug
  where coalesce(btrim(t.description), '') = '';

  if v_poses <> ${tags.length} then
    raise exception 'Lot 002 : % tags sur ${tags.length}.', v_poses;
  end if;
  if v_sans_definition > 0 then
    raise exception 'Lot 002 : % tags sans definition.', v_sans_definition;
  end if;
  raise notice 'Referentiel V3 : % tags, tous definis.', v_poses;
end $ctrl$;

drop table lot_tags_v3;

commit;
`,
);

// ---------------------------------------------------------------------------
// 1NN — Les cartes.
// ---------------------------------------------------------------------------

const colonnes = `(
  carte_id text, slug text, titre text, variante text, commande text,
  commande_titre text, commande_objectif text, rayon text,
  description_courte text, description_detaillee text, cas_usage text,
  operation text, medium text, usage_principal text, plateformes text[],
  donnees_personnalisables text, personnalisation jsonb, regime text,
  mode_copie text, references_fichiers jsonb, type_reference text,
  condition_reference text, defauts jsonb, politique_questions text,
  ratio_apercu text, ratio_sortie text, ratio_sortie_repli text,
  nombre_images smallint, organisation_sortie text, format_fichier text,
  rendu_galerie text, texte_image text, specification text,
  pistes_creatives text, regles_qualite text, capacites_requises text[],
  politique_recherche text, compatibilite_ia text, statut_test_ia text,
  type_temoin text, temoins_attendus jsonb, statut_editorial text,
  statut_validation text, origine text, reference_inspiration text,
  version_prompt text, date_revision text, ordre integer,
  ancienne_categorie text, ancienne_collection text, ancien_slug text,
  test_nominal text, test_personnalisation text, test_manquant text,
  test_visuel text
)`;

const ligneDeCarte = (c) => ({
  carte_id: c.carteId,
  slug: c.slug,
  titre: c.titre,
  variante: c.variante,
  commande: c.commande,
  commande_titre: c.commandeTitre,
  commande_objectif: c.commandeObjectif,
  rayon: refDuRayon(c),
  description_courte: c.descriptionCourte,
  description_detaillee: c.descriptionDetaillee,
  cas_usage: c.casUsage,
  operation: c.operation,
  medium: c.medium,
  usage_principal: c.usagePrincipal,
  plateformes: c.plateformes,
  donnees_personnalisables: c.donneesPersonnalisables,
  personnalisation: c.personnalisation,
  regime: c.regime,
  mode_copie: c.modeCopie,
  references_fichiers: c.references,
  type_reference: c.typeReference,
  condition_reference: c.conditionReference,
  defauts: c.defauts,
  politique_questions: c.politiqueQuestions,
  ratio_apercu: c.ratioApercu,
  ratio_sortie: c.ratioSortie,
  ratio_sortie_repli: c.ratioSortieRepli,
  nombre_images: c.nombreImages,
  organisation_sortie: c.organisationSortie,
  format_fichier: c.formatFichier,
  rendu_galerie: c.renduGalerie,
  texte_image: c.texteImage,
  specification: c.specification,
  pistes_creatives: c.pistesCreatives,
  regles_qualite: c.reglesQualite,
  capacites_requises: c.capacitesRequises,
  politique_recherche: c.politiqueRecherche,
  compatibilite_ia: c.compatibiliteIa,
  statut_test_ia: c.statutTestIa,
  type_temoin: c.typeTemoin,
  temoins_attendus: c.temoinsAttendus,
  statut_editorial: c.statutEditorial,
  statut_validation: c.statutValidation,
  origine: c.origine,
  reference_inspiration: c.referenceInspiration,
  version_prompt: c.versionPrompt,
  date_revision: c.dateRevision,
  ordre: c.ordre,
  ancienne_categorie: c.ancienneCategorie,
  ancienne_collection: c.ancienneCollection,
  ancien_slug: c.ancienSlug,
  test_nominal: c.testNominal,
  test_personnalisation: c.testPersonnalisation,
  test_manquant: c.testManquant,
  test_visuel: c.testVisuel,
});

for (let i = 0; i < cartes.length; i += TAILLE_LOT) {
  const lot = cartes.slice(i, i + TAILLE_LOT);
  const numero = String(101 + i / TAILLE_LOT);
  const debut = i + 1;
  const fin = i + lot.length;

  ajouter(
    `${numero}_cartes_${String(i / TAILLE_LOT + 1).padStart(2, '0')}.sql`,
    `-- Lot ${numero} : cartes ${debut} a ${fin} sur ${cartes.length}.
--
-- Les historiques sont mises a jour par \`card_id\`, les nouvelles creees en
-- brouillon. Ce qui n'est PAS editorial n'est jamais touche : statut,
-- gratuite, date de publication, compteur de coeurs, medias. Une carte
-- publiee reste publiee.

begin;

drop table if exists lot_v3;
create temporary table lot_v3 as
select * from jsonb_to_recordset(${litteral(lot.map(ligneDeCarte))})
as x ${colonnes};

-- --- Les historiques : mise a jour editoriale ---------------------------
update public.prompts p
set name = l.titre,
    slug = l.slug,
    card_slug = l.slug,
    variante = l.variante,
    commande_titre = l.commande_titre,
    command_objectif = l.commande_objectif,
    category_id = c.id,
    short_description = l.description_courte,
    description_detaillee = l.description_detaillee,
    use_cases = array[l.cas_usage],
    operation = l.operation,
    medium = l.medium,
    usage_principal = l.usage_principal,
    plateformes = coalesce(l.plateformes, '{}'),
    donnees_personnalisables = l.donnees_personnalisables,
    personnalisation = coalesce(l.personnalisation, '[]'::jsonb),
    regime_personnalisation = l.regime,
    copy_rule = l.mode_copie,
    references_fichiers = coalesce(l.references_fichiers, '[]'::jsonb),
    type_reference = l.type_reference,
    condition_reference = l.condition_reference,
    defauts = coalesce(l.defauts, '{}'::jsonb),
    questionnaire_policy = l.politique_questions,
    ratio_apercu = l.ratio_apercu,
    default_ratio = l.ratio_sortie,
    ratio_sortie_repli = l.ratio_sortie_repli,
    nombre_images = l.nombre_images,
    organisation_sortie = l.organisation_sortie,
    format_fichier = l.format_fichier,
    rendu_galerie = l.rendu_galerie,
    text_in_image_policy = l.texte_image,
    specification = l.specification,
    pistes_creatives = l.pistes_creatives,
    quality_criteria = l.regles_qualite,
    capacites_requises = coalesce(l.capacites_requises, '{}'),
    online_lookup_policy = l.politique_recherche,
    compatibilite_ia = l.compatibilite_ia,
    statut_test_ia = l.statut_test_ia,
    witness_type = l.type_temoin,
    temoins_attendus = coalesce(l.temoins_attendus, '[]'::jsonb),
    statut_editorial = l.statut_editorial,
    statut_validation = l.statut_validation,
    source_status = l.origine,
    reference_inspiration = l.reference_inspiration,
    revised_at = nullif(l.date_revision, '')::date,
    sort_order = l.ordre,
    legacy_category = l.ancienne_categorie,
    legacy_subcategory = l.ancienne_collection,
    catalog_version = 'visuels-v3',
    test_nominal = l.test_nominal,
    test_personnalisation = l.test_personnalisation,
    test_incomplete_context = l.test_manquant,
    test_visuel = l.test_visuel,
    -- L'ancien slug rejoint les alias : les liens deja partages continuent
    -- de mener quelque part apres le renommage.
    aliases = (
      select array_agg(distinct a)
      from unnest(p.aliases || array[l.ancien_slug]) as a
      where a is not null and a <> ''
    ),
    updated_at = now()
from lot_v3 l
join public.categories c on c.external_ref = l.rayon
where p.card_id = l.carte_id
  and l.origine = 'existant_revise';

-- --- Les nouvelles : creation en brouillon ------------------------------
--
-- Brouillon parce qu'aucune n'a de temoin : \`statut_media\` vaut
-- \`a_produire\` sur les 862. Publier une carte dont l'exemple n'existe pas
-- reviendrait a promettre un resultat qu'on ne montre pas.
insert into public.prompts (
  card_id, command, name, slug, card_slug, mode, library, category_id,
  short_description, description_detaillee, use_cases,
  variante, commande_titre, command_objectif,
  operation, medium, usage_principal, plateformes,
  donnees_personnalisables, personnalisation, regime_personnalisation, copy_rule,
  references_fichiers, type_reference, condition_reference, defauts,
  questionnaire_policy, ratio_apercu, default_ratio, ratio_sortie_repli,
  nombre_images, organisation_sortie, format_fichier, rendu_galerie,
  text_in_image_policy, specification, pistes_creatives, quality_criteria,
  capacites_requises, online_lookup_policy, compatibilite_ia, statut_test_ia,
  witness_type, temoins_attendus, statut_editorial, statut_validation,
  source_status, reference_inspiration, revised_at, sort_order,
  catalog_version, status, show_image_card, payload_ready,
  test_nominal, test_personnalisation, test_incomplete_context, test_visuel
)
select
  l.carte_id, l.commande::extensions.citext, l.titre, l.slug, l.slug,
  'image'::public.app_mode, 'images'::public.app_library, c.id,
  l.description_courte, l.description_detaillee, array[l.cas_usage],
  l.variante, l.commande_titre, l.commande_objectif,
  l.operation, l.medium, l.usage_principal, coalesce(l.plateformes, '{}'),
  l.donnees_personnalisables, coalesce(l.personnalisation, '[]'::jsonb),
  l.regime, l.mode_copie,
  coalesce(l.references_fichiers, '[]'::jsonb), l.type_reference,
  l.condition_reference, coalesce(l.defauts, '{}'::jsonb),
  l.politique_questions, l.ratio_apercu, l.ratio_sortie, l.ratio_sortie_repli,
  l.nombre_images, l.organisation_sortie, l.format_fichier, l.rendu_galerie,
  l.texte_image, l.specification, l.pistes_creatives, l.regles_qualite,
  coalesce(l.capacites_requises, '{}'), l.politique_recherche,
  l.compatibilite_ia, l.statut_test_ia,
  l.type_temoin, coalesce(l.temoins_attendus, '[]'::jsonb),
  l.statut_editorial, l.statut_validation,
  l.origine, l.reference_inspiration, nullif(l.date_revision, '')::date, l.ordre,
  'visuels-v3', 'draft'::public.content_status, true, true,
  l.test_nominal, l.test_personnalisation, l.test_manquant, l.test_visuel
from lot_v3 l
join public.categories c on c.external_ref = l.rayon
where l.origine = 'ajout_v3'
  and not exists (select 1 from public.prompts q where q.card_id = l.carte_id);

-- --- Les tags : on retire les anciens, on pose exactement ceux du CSV ----
delete from public.prompt_tags pt
using lot_v3 l, public.prompts p
where p.card_id = l.carte_id and pt.prompt_id = p.id;

insert into public.prompt_tags (prompt_id, tag_id)
select p.id, t.id
from lot_v3 l
join public.prompts p on p.card_id = l.carte_id
join jsonb_to_recordset(${litteral(
      lot.flatMap((c) => c.tags.map((slug) => ({ carte: c.carteId, tag: slug }))),
    )}) as j(carte text, tag text) on j.carte = l.carte_id
join public.tags t on t.slug = j.tag
on conflict (prompt_id, tag_id) do nothing;

do $ctrl$
declare
  v_posees integer;
  v_attendues integer;
  v_sans_rayon integer;
begin
  select count(*) into v_attendues from lot_v3;
  select count(*) into v_posees
  from lot_v3 l join public.prompts p on p.card_id = l.carte_id;
  select count(*) into v_sans_rayon
  from lot_v3 l join public.prompts p on p.card_id = l.carte_id
  where p.category_id is null;

  if v_posees <> v_attendues then
    raise exception 'Lot ${numero} : % cartes sur % posees.', v_posees, v_attendues;
  end if;
  if v_sans_rayon > 0 then
    raise exception 'Lot ${numero} : % cartes sans rayon.', v_sans_rayon;
  end if;
end $ctrl$;

drop table lot_v3;

commit;
`,
  );
}

// ---------------------------------------------------------------------------
// 3NN — Les payloads. Un seul texte, commun a toutes les IA.
// ---------------------------------------------------------------------------

for (let i = 0; i < cartes.length; i += TAILLE_LOT) {
  const lot = cartes.slice(i, i + TAILLE_LOT);
  const numero = String(301 + i / TAILLE_LOT);

  ajouter(
    `${numero}_payloads_${String(i / TAILLE_LOT + 1).padStart(2, '0')}.sql`,
    `-- Lot ${numero} : payloads ${i + 1} a ${i + lot.length} sur ${cartes.length}.
--
-- UN SEUL TEXTE, COMMUN AUX TROIS IA. Il n'existe plus de payload par
-- moteur : le meme prompt part vers ChatGPT, Claude et Gemini. Le selecteur
-- de destination change ou l'on colle, pas ce que l'on colle.
--
-- Le payload du CSV est complet et autonome. Rien ne lui est ajoute ici :
-- ni les regles de qualite, ni les pistes creatives, ni la specification
-- visuelle — elles y sont deja integrees, et les recoller produirait un
-- prompt qui se repete.

begin;

drop table if exists lot_payload_v3;
create temporary table lot_payload_v3 as
select * from jsonb_to_recordset(${litteral(
      lot.map((c) => ({ carte_id: c.carteId, payload: c.payload, version: c.versionPrompt })),
    )})
as x(carte_id text, payload text, version text);

-- Toute carte doit avoir ses variantes avant de recevoir un texte.
--
-- PAS DE CLAUDE SUR UNE IMAGE. Le referentiel du catalogue est formel et le
-- contrat V3 dit la meme chose : on n'annonce pas une compatibilite image a
-- partir du nom d'une IA. Un cross join sur les fournisseurs fabriquerait
-- une variante Claude pour 862 cartes visuelles, c'est-a-dire une promesse
-- que rien ne soutient. Les variantes ne sont donc creees que pour les
-- fournisseurs que la bibliotheque Images declare deja.
insert into public.prompt_variants (prompt_id, provider_id, compatibility, status, fallback_behavior)
select p.id, ia.id, 'excellent'::public.compatibility_level,
       'published'::public.content_status,
       'declare_unavailable_if_no_image_tool'::public.fallback_behavior
from lot_payload_v3 l
join public.prompts p on p.card_id = l.carte_id
join public.ai_providers ia on ia.key in ('chatgpt', 'gemini')
on conflict (prompt_id, provider_id) do nothing;

-- L'ancienne version sort du courant seulement si le texte change vraiment :
-- rejouer le lot ne doit pas empiler des versions identiques.
update public.prompt_versions pv
set is_current = false,
    status = 'retired'::public.version_status
from lot_payload_v3 l
join public.prompts p on p.card_id = l.carte_id
join public.prompt_variants v on v.prompt_id = p.id
where pv.variant_id = v.id
  and pv.is_current
  and pv.payload is distinct from l.payload;

insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
select v.id, l.version, l.payload, 'published'::public.version_status, true, now()
from lot_payload_v3 l
join public.prompts p on p.card_id = l.carte_id
join public.prompt_variants v on v.prompt_id = p.id
where not exists (
  select 1 from public.prompt_versions pv where pv.variant_id = v.id and pv.is_current
);

do $ctrl$
declare
  v_attendues integer;
  v_courantes integer;
begin
  select count(*) into v_attendues from lot_payload_v3;
  select count(distinct l.carte_id) into v_courantes
  from lot_payload_v3 l
  join public.prompts p on p.card_id = l.carte_id
  join public.prompt_variants v on v.prompt_id = p.id
  join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
  where pv.payload = l.payload;

  if v_courantes <> v_attendues then
    raise exception 'Lot ${numero} : % cartes ont le bon texte courant sur %.',
      v_courantes, v_attendues;
  end if;
end $ctrl$;

drop table lot_payload_v3;

commit;
`,
  );
}

// ---------------------------------------------------------------------------
// 900 — La categorie de transition.
// ---------------------------------------------------------------------------

ajouter(
  '900_transition.sql',
  `-- Lot 900 : ou en sont les cartes que le CSV ne couvre pas. AUCUNE ECRITURE.
--
-- CE LOT DEPLACAIT DES CARTES. IL N'EN DEPLACE PLUS, ET C'EST UNE
-- CORRECTION.
--
-- Il avait ete ecrit sur une premisse fausse : que les cartes absentes du
-- CSV se retrouveraient sans rayon une fois les douze categories V3 en
-- place, donc publiees et introuvables. Verification faite, c'est inexact.
-- L'import V3 AJOUTE des categories, il n'en retire aucune : les 1 768
-- cartes publiees d'Images sont toutes rangees, 1 701 dans une categorie
-- visible, sur 53 rayons. Aucune n'est orpheline.
--
-- Le vrai defaut est autre, et plus doux : la navigation montrerait les
-- douze rayons V3 A COTE des anciens, soit deux taxonomies concurrentes sur
-- le meme ecran. C'est une decision editoriale — quels anciens rayons on
-- ferme, et quand — pas quelque chose qu'un lot d'import doit trancher tout
-- seul en vidant 959 cartes de leur rayon.
--
-- Deplacer aurait coute cher : chaque carte hors CSV perd son classement
-- reel pour un fourre-tout, et le rangement editorial de septembre 2026
-- (verifie par tests/integration/28) serait defait sans que personne l'ait
-- demande. La categorie « A reclasser » est bien creee par le lot 001 :
-- elle attend qu'on decide de s'en servir.
--
-- Ce lot compte donc, et n'ecrit rien.

drop table if exists lot_couvertes_v3;
create temporary table lot_couvertes_v3 as
select * from jsonb_to_recordset(${litteral(tousLesIds.map((id) => ({ id })))})
as x(id text);

create index on lot_couvertes_v3 (id);

do $ctrl$
declare
  v_hors_csv integer;
  v_rayons integer;
  v_orphelines integer;
begin
  select count(*), count(distinct p.category_id)
    into v_hors_csv, v_rayons
  from public.prompts p
  where p.library = 'images'::public.app_library
    and p.status = 'published'::public.content_status
    and (p.card_id is null or not exists (select 1 from lot_couvertes_v3 c where c.id = p.card_id));

  select count(*) into v_orphelines
  from public.prompts p
  where p.library = 'images'::public.app_library
    and p.status = 'published'::public.content_status
    and p.category_id is null;

  raise notice 'Hors CSV : % cartes publiees, reparties sur % rayons.', v_hors_csv, v_rayons;
  raise notice 'Elles gardent leur rangement. Aucune n''a ete deplacee.';

  -- La seule chose qui serait vraiment cassee : une carte publiee sans
  -- rayon du tout. Celle-la n'apparaitrait nulle part.
  if v_orphelines > 0 then
    raise exception 'Lot 900 : % cartes publiees sans aucune categorie.', v_orphelines;
  end if;
end $ctrl$;

drop table lot_couvertes_v3;
`,
);

// ---------------------------------------------------------------------------
// Ecriture.
// ---------------------------------------------------------------------------

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let octets = 0;
for (const { nom, sql } of lots) {
  writeFileSync(join(OUT, nom), sql);
  octets += Buffer.byteLength(sql);
}

console.log(`${lots.length} lots ecrits dans supabase/seed/visuels-v3`);
console.log(
  `  ${cartes.length} cartes, ${categories.length} categories, ` +
    `${collections.length} collections, ${tags.length} tags`,
);
console.log(`  ${(octets / 1024 / 1024).toFixed(1)} Mo de SQL`);
