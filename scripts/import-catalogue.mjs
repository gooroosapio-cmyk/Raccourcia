#!/usr/bin/env node
/**
 * Genere supabase/seed/catalogue.sql a partir de data/catalogue/*.json (v2.0).
 *
 * Le SQL produit est compact : les donnees voyagent sous forme de tableaux
 * JSON deroules par jsonb_to_recordset, et chaque table recoit une seule
 * instruction. Le fichier reste idempotent : le rejouer met a jour les lignes
 * existantes sans creer de doublon et sans ecraser les visuels ajoutes
 * depuis /admin.
 *
 * Les 250 payloads suivent un modele unique, verifie octet par octet contre
 * le tableur : le seed porte le modele, Postgres le remplit depuis les champs
 * deja inseres. Rien n'est recopie deux fois.
 *
 *   npm run catalogue:import
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'catalogue');
const OUTPUT = join(ROOT, 'supabase', 'seed', 'catalogue.sql');

/** Delimiteur dollar-quote : evite tout echappement dans les payloads. */
const TAG = '$raccourcia$';

const read = (name) => JSON.parse(readFileSync(join(DATA, name), 'utf8'));

const prompts = read('prompts.json');
const qcmRows = read('qcm.json');
const taxonomy = read('taxonomie.json');

const warnings = [];

function jsonLiteral(rows) {
  const compact = rows.map((row) =>
    Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null)),
  );
  const json = JSON.stringify(compact);
  if (json.includes(TAG)) {
    throw new Error(`Le delimiteur ${TAG} apparait dans les donnees.`);
  }
  return `${TAG}${json}${TAG}`;
}

/** "a; b; c" -> ["a", "b", "c"] */
function splitList(value, separator = ';') {
  if (!value) return [];
  return value
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean);
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// --- Taxonomie --------------------------------------------------------------
// Le tableur v2 porte lui-meme la hierarchie et l'ordre d'affichage :
// 10 categories, 20 sous-categories, deux domaines publics.
const MODE_BY_DOMAIN = { IMAGE: 'image', TEXTE: 'texte' };

const parentCategories = [];
const childCategories = [];
const parentSlugByKey = new Map();
const categorySlugByKey = new Map();
const knownSlugs = new Set();

for (const row of taxonomy) {
  const mode = MODE_BY_DOMAIN[row.domaine];
  if (!mode) {
    warnings.push(`Taxonomie : domaine inconnu "${row.domaine}".`);
    continue;
  }

  const parentKey = `${row.domaine}::${row.categorie}`;
  let parentSlug = parentSlugByKey.get(parentKey);
  if (!parentSlug) {
    parentSlug = `${mode}-${slugify(row.categorie)}`;
    parentSlugByKey.set(parentKey, parentSlug);
    parentCategories.push({
      slug: parentSlug,
      mode,
      name: row.categorie,
      status: 'published',
      sort_order: Number(row.ordre_categorie ?? 0),
    });
    knownSlugs.add(parentSlug);
  }

  const childSlug = `${parentSlug}-${slugify(row.sous_categorie)}`;
  if (knownSlugs.has(childSlug)) {
    warnings.push(`Taxonomie : slug en collision "${childSlug}".`);
    continue;
  }
  knownSlugs.add(childSlug);
  childCategories.push({
    slug: childSlug,
    parent_slug: parentSlug,
    mode,
    name: row.sous_categorie,
    status: row.statut === 'actif' ? 'published' : 'draft',
    sort_order: Number(row.ordre_sous_categorie ?? 0),
  });
  categorySlugByKey.set(`${row.domaine}::${row.categorie}::${row.sous_categorie}`, childSlug);
}

// --- QCM par prompt ---------------------------------------------------------
const qcmByPrompt = new Map();
for (const row of qcmRows) {
  const list = qcmByPrompt.get(row.prompt_id) ?? [];
  list.push(row);
  qcmByPrompt.set(row.prompt_id, list);
}
for (const list of qcmByPrompt.values()) {
  list.sort((a, b) => Number(a.ordre ?? 0) - Number(b.ordre ?? 0));
}

// --- Factorisation par mode -------------------------------------------------
/**
 * Le tableur remplit une quinzaine de colonnes a l'identique pour tous les
 * raccourcis d'un meme domaine (contexte, format de sortie, criteres qualite,
 * garde-fous, regle de copie...). On les factorise par mode : le seed ne les
 * ecrit qu'une fois et chaque raccourci n'y deroge que s'il a une valeur propre.
 */
const SHARED_BY_MODE = {
  minimal_context: 'contexte_minimal',
  sufficient_context: 'contexte_suffisant',
  default_values: 'valeurs_defaut',
  expected_output: 'sortie_attendue',
  output_format: 'format_sortie',
  quality_criteria: 'criteres_qualite',
  preserve_rules: 'a_preserver',
  avoid_rules: 'a_eviter',
  limitations: 'limites',
  fallback_if_incomplete: 'fallback_si_incomplet',
  usage_conditions: 'conditions_utilisation',
  primary_input: 'entree_primaire',
  accepted_inputs: 'entrees_acceptees',
  attachment_rule: 'piece_jointe',
  blocking_condition: 'condition_blocage',
  questionnaire_mode: 'questionnaire_mode',
  thumbnail_spec: 'spec_image_temoin',
  thumbnail_layout: 'spec_miniature',
  copy_rule: 'regle_copie',
  test_nominal: 'test_nominal',
  test_incomplete_context: 'test_contexte_incomplet',
  test_blocking: 'test_blocage',
};

/** Le declencheur de QCM appartient a la version, pas au raccourci. */
const SHARED_BY_VERSION = { qcm_trigger: 'declencheur_questions' };

/** Ordre de reference des colonnes factorisees, partage par le SQL genere. */
const SHARED_COLUMNS = Object.keys(SHARED_BY_MODE);

/**
 * Dictionnaire par colonne.
 *
 * Chacune de ces colonnes ne prend qu'une poignee de valeurs distinctes sur
 * tout le catalogue (le tableur emploie une formulation pour les raccourcis
 * d'origine et une autre pour les nouveaux). Plutot que de recopier la phrase
 * 250 fois, on ecrit chaque valeur une seule fois et le raccourci n'en porte
 * que l'indice : c'est ce qui garde le seed sous les 150 Ko.
 */
const dictionaries = new Map();

for (const [column, source] of Object.entries({ ...SHARED_BY_MODE, ...SHARED_BY_VERSION })) {
  const values = [];
  const indexByValue = new Map();
  for (const row of prompts) {
    const value = row[source] ?? null;
    if (!indexByValue.has(value)) {
      indexByValue.set(value, values.length);
      values.push(value);
    }
  }
  dictionaries.set(column, { values, indexByValue });
}

/** Indice de la valeur dans le dictionnaire de la colonne. */
function dictIndex(column, value) {
  return dictionaries.get(column).indexByValue.get(value ?? null);
}

/** `('["a","b"]'::jsonb ->> d.x_idx)` : la valeur est relue par son indice. */
function dictExpression(column) {
  const json = JSON.stringify(dictionaries.get(column).values);
  if (json.includes(TAG)) throw new Error(`Le delimiteur ${TAG} apparait dans les donnees.`);
  return `(${TAG}${json}${TAG}::jsonb ->> d.${column}_idx)`;
}

// --- Compatibilite IA -------------------------------------------------------
// Le tableur decrit la capacite en une phrase par domaine, sans promesse
// absolue (Regle R14) : une ligne par couple (mode, IA) suffit.
const PROVIDERS = ['chatgpt', 'claude', 'gemini'];
const compatByModeProvider = new Map();

/** Le type d'entree normalise pilote la logique ; primary_input reste le mot du tableur. */
const INPUT_TYPE = {
  image: 'image',
  texte: 'text',
  document: 'document',
  'URL ou document': 'mixed',
  'tableau/données': 'mixed',
};

// --- Construction des jeux de donnees ---------------------------------------
const promptRows = [];
const versionRows = [];
const qcmSets = [];
const qcmKeyBySignature = new Map();
let variantCount = 0;

for (const row of prompts) {
  const mode = MODE_BY_DOMAIN[row.domaine];
  if (!mode) {
    warnings.push(`${row.id} : domaine inconnu "${row.domaine}", ligne ignoree.`);
    continue;
  }

  const categorySlug = categorySlugByKey.get(
    `${row.domaine}::${row.categorie}::${row.sous_categorie}`,
  );
  if (!categorySlug) {
    warnings.push(`${row.id} : sous-categorie "${row.sous_categorie}" absente de Taxonomie.`);
    continue;
  }

  const command = (row.command ?? '').trim().toLowerCase();
  if (!/^\/[a-z0-9][a-z0-9_-]*$/.test(command)) {
    warnings.push(`${row.id} : commande invalide "${row.command}".`);
    continue;
  }

  const isImage = mode === 'image';
  // Les anciens raccourcis ANALYSER produisent une analyse, meme reclasses
  // sous TEXTE > Travail & pilotage > Analyser & decider (Regle R03).
  const isAnalysis = (row.id ?? '').startsWith('RCI-ANA');

  promptRows.push({
    external_ref: row.id,
    command,
    name: row.title,
    slug: slugify(command.slice(1)),
    mode,
    category_slug: categorySlug,
    short_description: row.description_courte,
    intention: row.intention,
    use_cases: row.cas_usage_principal ? [row.cas_usage_principal] : [],
    usage_example: row.exemple_usage,
    tags: splitList(row.tags),
    required_variables: splitList(row.variables_requises),
    optional_variables: splitList(row.variables_optionnelles),
    max_questions: Number(row.nombre_questions_max ?? 1),
    // Colonnes factorisees : seul l'indice du dictionnaire voyage.
    ...Object.fromEntries(
      Object.entries(SHARED_BY_MODE).map(([column, source]) => [
        `${column}_idx`,
        dictIndex(column, row[source]),
      ]),
    ),
    input_type: INPUT_TYPE[row.entree_primaire] ?? 'mixed',
    output_type: isImage ? 'image' : isAnalysis ? 'analysis' : 'text',
    risk_level: (row.niveau_risque ?? 'faible').replace('élevé', 'eleve'),
    priority: row.priorite ?? 'P0',
    source_status: row.source_status,
    catalog_version: row.version,
    revised_at: row.date_revision,
    // Regle R13 : seuls les raccourcis IMAGE imposent une carte visuelle.
    show_image_card: isImage,
    sort_order: promptRows.length + 1,
  });

  for (const provider of PROVIDERS) {
    const key = `${mode}::${provider}`;
    if (!compatByModeProvider.has(key)) {
      compatByModeProvider.set(key, {
        mode,
        provider_key: provider,
        // Le tableur decrit une capacite, pas une garantie : le niveau reste
        // "bon" et la phrase exacte du catalogue porte la nuance.
        compatibility: 'bon',
        compatibility_note: row[`compat_${provider}`] ?? null,
        status: 'published',
      });
    }
    variantCount += 1;
  }

  // QCM : 3 questions maximum (Regle R07). Plusieurs raccourcis partagent le
  // meme jeu de questions : on le deduplique.
  const questions = (qcmByPrompt.get(row.id) ?? []).slice(0, 3);
  const qcm = questions.map((entry) => ({
    question: entry.question,
    options: splitList(entry.choix, '|'),
    variable: entry.variable,
    valeur_defaut: entry.valeur_defaut,
  }));

  const signature = JSON.stringify(qcm);
  let qcmKey = qcmKeyBySignature.get(signature);
  if (!qcmKey) {
    qcmKey = `qcm-${qcmKeyBySignature.size + 1}`;
    qcmKeyBySignature.set(signature, qcmKey);
    qcmSets.push({ key: qcmKey, qcm });
  }

  versionRows.push({
    external_ref: row.id,
    version_label: row.version ?? 'v2.0',
    qcm_key: qcmKey,
    qcm_trigger_idx: dictIndex('qcm_trigger', row.declencheur_questions),
  });
}

const obsoleteNote = `${parentCategories.length + childCategories.length} categories v2`;

// --- Generation SQL ---------------------------------------------------------
const sql = `-- =====================================================================
-- RaccourcIA - import du catalogue editorial v2.0
-- GENERE AUTOMATIQUEMENT par scripts/import-catalogue.mjs. Ne pas editer.
--
-- Ce fichier est idempotent : il peut etre rejoue sans creer de doublon.
-- Apres mise en production, Supabase devient la seule source de verite
-- runtime : les modifications se font dans /admin, pas ici.
--
-- Les 151 raccourcis d'origine conservent leur identifiant editorial et
-- leur historique : ils sont mis a jour, jamais recrees. 99 raccourcis
-- s'ajoutent. Les categories v1 devenues sans objet sont archivees, jamais
-- supprimees.
--
-- ${parentCategories.length} categories, ${childCategories.length} sous-categories,
-- ${promptRows.length} raccourcis, ${variantCount} variantes IA,
-- ${qcmSets.length} jeux de QCM distincts.
-- =====================================================================

begin;

-- --- Categories -------------------------------------------------------
insert into public.categories (slug, parent_id, mode, name, status, sort_order)
select d.slug, null, d.mode::public.app_mode, d.name,
       d.status::public.content_status, d.sort_order
from jsonb_to_recordset(${jsonLiteral(parentCategories)}::jsonb)
  as d(slug text, mode text, name text, status text, sort_order integer)
on conflict (slug) do update
  set name = excluded.name, mode = excluded.mode, status = excluded.status,
      sort_order = excluded.sort_order;

-- --- Sous-categories --------------------------------------------------
insert into public.categories (slug, parent_id, mode, name, status, sort_order)
select d.slug, p.id, d.mode::public.app_mode, d.name,
       d.status::public.content_status, d.sort_order
from jsonb_to_recordset(${jsonLiteral(childCategories)}::jsonb)
  as d(slug text, parent_slug text, mode text, name text, status text, sort_order integer)
join public.categories p on p.slug = d.parent_slug
on conflict (slug) do update
  set name = excluded.name, parent_id = excluded.parent_id, mode = excluded.mode,
      status = excluded.status, sort_order = excluded.sort_order;

-- --- Jeux de questions ------------------------------------------------
-- Le bloc numerote du prompt copiable est reconstruit depuis le QCM lui-meme :
-- stocker les deux serait stocker deux fois le meme texte.
create temporary table seed_qcm_sets on commit drop as
select
  d.key,
  d.qcm,
  (
    select string_agg(
      e.ord || '. ' || (e.item ->> 'question') || ' ' || (
        select string_agg(chr(64 + o::int) || '. ' || opt, ' ' order by o)
        from jsonb_array_elements_text(e.item -> 'options') with ordinality as t(opt, o)
      ),
      chr(10) order by e.ord
    )
    from jsonb_array_elements(d.qcm) with ordinality as e(item, ord)
  ) as qcm_block
from jsonb_to_recordset(${jsonLiteral(qcmSets)}::jsonb) as d(key text, qcm jsonb);

-- --- Raccourcis -------------------------------------------------------
-- Les colonnes factorisees sont relues dans leur dictionnaire par indice :
-- chaque phrase partagee n'apparait qu'une fois dans ce fichier.
insert into public.prompts (
  external_ref, command, name, slug, mode, category_id, short_description, intention,
  use_cases, usage_example, tags, required_variables, optional_variables, max_questions,
${SHARED_COLUMNS.map((column) => `  ${column},`).join('\n')}
  input_type, output_type, risk_level, priority, source_status, catalog_version, revised_at,
  status, show_image_card, sort_order, published_at
)
select
  d.external_ref, d.command::extensions.citext, d.name, d.slug, d.mode::public.app_mode, c.id,
  d.short_description, d.intention,
  coalesce(d.use_cases, '{}'), d.usage_example, coalesce(d.tags, '{}'),
  coalesce(d.required_variables, '{}'), coalesce(d.optional_variables, '{}'),
  d.max_questions,
${SHARED_COLUMNS.map((column) => `  ${dictExpression(column)},`).join('\n')}
  d.input_type::public.input_type, d.output_type::public.output_type,
  d.risk_level::public.risk_level, d.priority, d.source_status,
  d.catalog_version, d.revised_at::date,
  'published'::public.content_status, coalesce(d.show_image_card, false),
  d.sort_order, now()
from jsonb_to_recordset(${jsonLiteral(promptRows)}::jsonb)
  as d(
    external_ref text, command text, name text, slug text, mode text, category_slug text,
    short_description text, intention text, use_cases text[], usage_example text, tags text[],
    required_variables text[], optional_variables text[], max_questions smallint,
${SHARED_COLUMNS.map((column) => `    ${column}_idx integer,`).join('\n')}
    input_type text, output_type text, risk_level text, priority text, source_status text,
    catalog_version text, revised_at text, show_image_card boolean, sort_order integer
  )
join public.categories c on c.slug = d.category_slug
on conflict (external_ref) do update set
  command = excluded.command, name = excluded.name, slug = excluded.slug,
  mode = excluded.mode, category_id = excluded.category_id,
  short_description = excluded.short_description, intention = excluded.intention,
  use_cases = excluded.use_cases, usage_example = excluded.usage_example,
  tags = excluded.tags, required_variables = excluded.required_variables,
  optional_variables = excluded.optional_variables, max_questions = excluded.max_questions,
${SHARED_COLUMNS.map((column) => `  ${column} = excluded.${column},`).join('\n')}
  input_type = excluded.input_type, output_type = excluded.output_type,
  risk_level = excluded.risk_level, priority = excluded.priority,
  source_status = excluded.source_status, catalog_version = excluded.catalog_version,
  revised_at = excluded.revised_at, show_image_card = excluded.show_image_card,
  sort_order = excluded.sort_order;

-- --- Categories v1 devenues sans objet --------------------------------
-- Archivees, jamais supprimees : leurs raccourcis ont deja rejoint la
-- taxonomie v2 juste au-dessus, et l'historique reste consultable.
update public.categories
   set status = 'archived'
 where slug not in (
   select d.slug from jsonb_to_recordset(
     ${jsonLiteral([...parentCategories, ...childCategories].map((c) => ({ slug: c.slug })))}::jsonb
   ) as d(slug text)
 )
   and status <> 'archived'
   and not exists (
     select 1 from public.prompts p
     where p.category_id = public.categories.id and p.status = 'published'
   );

-- --- Variantes par IA -------------------------------------------------
-- La capacite annoncee depend du mode, pas du raccourci : une ligne par
-- couple (mode, IA) suffit a produire les trois variantes de chaque prompt.
insert into public.prompt_variants (prompt_id, provider_id, compatibility, compatibility_note, status)
select p.id, pr.id, d.compatibility::public.compatibility_level, d.compatibility_note,
       d.status::public.content_status
from jsonb_to_recordset(${jsonLiteral([...compatByModeProvider.values()])}::jsonb)
  as d(mode text, provider_key text, compatibility text,
       compatibility_note text, status text)
join public.prompts p on p.mode = d.mode::public.app_mode and p.external_ref like 'RCI-%'
join public.ai_providers pr on pr.key = d.provider_key
on conflict (prompt_id, provider_id) do update set
  compatibility = excluded.compatibility, compatibility_note = excluded.compatibility_note,
  status = excluded.status;

-- --- Versions de payload ----------------------------------------------
-- La version precedente n'est jamais ecrasee : elle est retiree du courant
-- et reste consultable (Regle R12). Seules les variantes qui recoivent une
-- version v2.0 sont touchees.
update public.prompt_versions existing
   set is_current = false, status = 'retired'
  from public.prompt_variants v
  join public.prompts p on p.id = v.prompt_id
 where existing.variant_id = v.id
   and existing.is_current
   and existing.version_label <> ${TAG}v2.0${TAG}
   and p.external_ref like 'RCI-%';

-- Les 250 payloads suivent un modele unique : plutot que de recopier 330 Ko
-- de texte, le seed porte le modele et Postgres le remplit depuis les champs
-- deja inseres. Le texte stocke est rigoureusement celui du catalogue
-- editorial (verifie octet par octet par tests/db/run.sh).
--
-- Le payload initial est identique pour les trois IA : chaque variante recoit
-- le meme texte. L'admin pourra ensuite faire diverger une version par IA
-- sans toucher au code.
insert into public.prompt_versions
  (variant_id, version_label, payload, qcm, qcm_trigger, status, is_current, published_at)
select
  v.id,
  d.version_label,
  format(
    $tpl$[RaccourcIA %s]
Rôle: exécuter « %s ».
Objectif: %s

1. CONTEXTE
Analyse d'abord le message, la conversation et les pièces jointes. N'invente aucune donnée. Si le contexte suffit, exécute immédiatement.
Entrée primaire: %s. Entrées acceptées: %s.
Variables indispensables: %s.

2. QUESTIONS CONDITIONNELLES
Mode: %s. Ne pose que les questions réellement bloquantes, maximum %s.
%s

3. EXÉCUTION
%s
Préserver: %s
Éviter: %s
Blocage: %s

4. SORTIE
%s

5. CONTRÔLE QUALITÉ
%s
Signale brièvement toute hypothèse ou limite qui change la fiabilité du résultat.$tpl$,
    p.command::text, p.name, p.intention,
    p.primary_input, p.accepted_inputs,
    array_to_string(p.required_variables, '; '),
    p.questionnaire_mode, p.max_questions, q.qcm_block,
    p.short_description, p.preserve_rules, p.avoid_rules, p.blocking_condition,
    p.output_format, p.quality_criteria
  ),
  q.qcm,
  ${dictExpression('qcm_trigger')},
  'published'::public.version_status, true, now()
from jsonb_to_recordset(${jsonLiteral(versionRows)}::jsonb)
  as d(external_ref text, version_label text, qcm_key text, qcm_trigger_idx integer)
join public.prompts p on p.external_ref = d.external_ref
join public.prompt_variants v on v.prompt_id = p.id
join seed_qcm_sets q on q.key = d.qcm_key
where not exists (
  select 1 from public.prompt_versions existing
  where existing.variant_id = v.id and existing.version_label = d.version_label
);

commit;
`;

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, sql, 'utf8');

console.log(`Categories       : ${obsoleteNote}`);
console.log(`Raccourcis       : ${promptRows.length} / ${prompts.length}`);
console.log(`Variantes IA     : ${variantCount}`);
console.log(`Jeux de QCM      : ${qcmSets.length}`);
console.log(`Taille du seed   : ${(sql.length / 1024).toFixed(0)} Ko`);
console.log(`Fichier genere   : supabase/seed/catalogue.sql`);

if (warnings.length > 0) {
  console.warn(`\n${warnings.length} avertissement(s) :`);
  for (const warning of warnings) console.warn(`  - ${warning}`);
  process.exitCode = 1;
}
