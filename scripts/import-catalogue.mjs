#!/usr/bin/env node
/**
 * Genere supabase/seed/catalogue.sql a partir de data/catalogue/*.json.
 *
 * Le SQL produit est compact : les donnees voyagent sous forme de tableaux
 * JSON deroules par jsonb_to_recordset, et chaque table recoit une seule
 * instruction. Le fichier reste idempotent : le rejouer met a jour les lignes
 * existantes sans creer de doublon et sans ecraser les visuels ajoutes
 * depuis /admin.
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
const taxonomy = read('taxonomie-map.json');

/**
 * Serialise un tableau d'objets en litteral JSON dollar-quote.
 * Les cles nulles sont omises : jsonb_to_recordset les rendra NULL, et le SQL
 * retombe alors sur la valeur commune du mode.
 */
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

/**
 * Decoupe "Ton ? A. Clair B. Premium C. Autre" en question + options,
 * afin que l'interface puisse afficher un QCM court plutot qu'un bloc de texte.
 */
function parseQcmQuestion(raw) {
  const text = raw.trim();
  const firstOption = text.search(/\s[A-D]\.\s/);
  if (firstOption === -1) return { question: text, options: [] };

  const question = text.slice(0, firstOption).trim();
  const options = text
    .slice(firstOption)
    .split(/\s(?=[A-D]\.\s)/)
    .map((part) => part.replace(/^[A-D]\.\s*/, '').trim())
    .filter(Boolean);

  return { question, options };
}

// --- Taxonomie -------------------------------------------------------------
const familyLabel = (family) => taxonomy.familyLabels[family] ?? family;

/** "domaine::famille" -> slug de la categorie de rattachement */
const familyIndex = new Map();
const parentCategories = [];
const childCategories = [];

for (const [domain, config] of Object.entries(taxonomy.modes)) {
  let order = 0;
  for (const group of config.groups) {
    order += 1;
    parentCategories.push({
      slug: group.slug,
      mode: config.mode,
      name: group.name,
      status: config.status,
      sort_order: order,
    });

    let childOrder = 0;
    for (const family of group.families) {
      const key = `${domain}::${family}`;
      if (config.flat) {
        familyIndex.set(key, group.slug);
        continue;
      }
      childOrder += 1;
      const childSlug = `${group.slug}-${slugify(family)}`;
      childCategories.push({
        slug: childSlug,
        parent_slug: group.slug,
        mode: config.mode,
        name: familyLabel(family),
        status: config.status,
        sort_order: childOrder,
      });
      familyIndex.set(key, childSlug);
    }
  }
}

// --- QCM par prompt --------------------------------------------------------
const qcmByPrompt = new Map();
for (const row of qcmRows) {
  const list = qcmByPrompt.get(row.prompt_id) ?? [];
  list.push({ order: Number(row.ordre ?? 0), question: row.question });
  qcmByPrompt.set(row.prompt_id, list);
}

// --- Compatibilite ---------------------------------------------------------
const PROVIDERS = ['chatgpt', 'claude', 'gemini'];

/** Traduit la colonne compat_* du tableur en niveau + note honnete. */
function compatibility(raw) {
  const value = (raw ?? '').toLowerCase();
  if (!value) return { level: 'non_supporte', note: null };
  if (value === 'excellent') return { level: 'excellent', note: null };
  if (value === 'bon') return { level: 'bon', note: null };
  if (value.includes('utilisable') || value.includes('selon interface')) {
    return {
      level: 'partiel',
      note: "Le prompt est utilisable ; l'execution de l'image depend de l'interface.",
    };
  }
  return { level: 'partiel', note: raw };
}

const MODE_BY_DOMAIN = { image: 'image', ecrire: 'texte', analyser: 'analyse' };

/**
 * Le tableur remplit une douzaine de colonnes a l'identique pour tous les
 * raccourcis d'un meme domaine (contexte attendu, format de sortie, criteres
 * qualite, garde-fous...). On les factorise par mode : le seed ne les ecrit
 * qu'une fois et chaque raccourci n'y deroge que s'il a une valeur propre.
 */
const SHARED_BY_MODE = {
  expected_input: 'entree_attendue',
  minimal_context: 'contexte_minimal',
  sufficient_context: 'contexte_suffisant',
  default_values: 'valeurs_defaut',
  expected_output: 'sortie_attendue',
  output_format: 'format_sortie',
  quality_criteria: 'criteres_qualite',
  preserve_rules: 'a_preserver',
  avoid_rules: 'a_eviter',
  fallback_if_incomplete: 'fallback_si_incomplet',
  admin_notes: 'admin_notes',
  qcm_trigger: 'qcm_declencheur',
};

/** Valeur majoritaire d'une colonne pour un mode donne. */
function dominantValue(rows, column) {
  const counts = new Map();
  for (const row of rows) {
    const value = row[column] ?? null;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

// --- Construction des jeux de donnees ---------------------------------------
const promptRows = [];
const compatByModeProvider = new Map();
let variantCount = 0;
const versionRows = [];
const warnings = [];
const qcmSets = [];
const qcmKeyBySignature = new Map();

const modeDefaults = Object.entries(MODE_BY_DOMAIN).map(([domain, mode]) => {
  const rows = prompts.filter((row) => row.domain === domain);
  const entry = { mode };
  for (const [column, source] of Object.entries(SHARED_BY_MODE)) {
    entry[column] = rows.length ? dominantValue(rows, source) : null;
  }
  return entry;
});
const defaultsByMode = new Map(modeDefaults.map((entry) => [entry.mode, entry]));

/** N'ecrit la valeur que si elle differe de la valeur commune du mode. */
function override(mode, column, value) {
  const shared = defaultsByMode.get(mode)?.[column] ?? null;
  const actual = value ?? null;
  return actual === shared ? null : actual;
}

for (const row of prompts) {
  const mode = MODE_BY_DOMAIN[row.domain];
  if (!mode) {
    warnings.push(`${row.id} : domaine inconnu "${row.domain}", ligne ignoree.`);
    continue;
  }

  const categorySlug = familyIndex.get(`${row.domain}::${row.family}`);
  if (!categorySlug) {
    warnings.push(`${row.id} : famille "${row.family}" absente de taxonomie-map.json.`);
    continue;
  }

  const command = (row.command ?? '').trim().toLowerCase();
  if (!/^\/[a-z0-9][a-z0-9_-]*$/.test(command)) {
    warnings.push(`${row.id} : commande invalide "${row.command}".`);
    continue;
  }

  const isImage = mode === 'image';
  const useCases = splitList(row.exemples_usage, '|').length
    ? splitList(row.exemples_usage, '|')
    : splitList(row.exemples_usage, ';');

  promptRows.push({
    external_ref: row.id,
    command,
    name: row.title,
    slug: slugify(command.slice(1)),
    mode,
    category_slug: categorySlug,
    short_description: row.description_courte,
    intention: row.intention,
    use_cases: useCases,
    tags: splitList(row.tags),
    expected_input: override(mode, 'expected_input', row.entree_attendue),
    minimal_context: override(mode, 'minimal_context', row.contexte_minimal),
    sufficient_context: override(mode, 'sufficient_context', row.contexte_suffisant),
    required_variables: splitList(row.variables_requises),
    optional_variables: splitList(row.variables_optionnelles),
    default_values: override(mode, 'default_values', row.valeurs_defaut),
    expected_output: override(mode, 'expected_output', row.sortie_attendue),
    output_format: override(mode, 'output_format', row.format_sortie),
    quality_criteria: override(mode, 'quality_criteria', row.criteres_qualite),
    preserve_rules: override(mode, 'preserve_rules', row.a_preserver),
    avoid_rules: override(mode, 'avoid_rules', row.a_eviter),
    limitations: row.limites,
    fallback_if_incomplete: override(mode, 'fallback_if_incomplete', row.fallback_si_incomplet),
    input_type: isImage ? 'image' : row.domain === 'analyser' ? 'document' : 'text',
    output_type: isImage ? 'image' : row.domain === 'analyser' ? 'analysis' : 'text',
    risk_level: row.niveau_risque ?? 'faible',
    priority: row.priorite_v1 ?? 'P0',
    show_image_card: isImage,
    thumbnail_spec: row.thumbnail_spec,
    admin_notes: override(mode, 'admin_notes', row.admin_notes),
    sort_order: promptRows.length + 1,
  });

  // La compatibilite annoncee ne depend que du mode : on l'ecrit une fois par
  // couple (mode, IA) plutot que 453 fois.
  for (const provider of PROVIDERS) {
    const { level, note } = compatibility(row[`compat_${provider}`]);
    const key = `${mode}::${provider}`;
    if (!compatByModeProvider.has(key)) {
      compatByModeProvider.set(key, {
        mode,
        provider_key: provider,
        compatibility: level,
        compatibility_note: note,
        // Une compatibilite inconnue reste en brouillon : l'interface ne doit
        // jamais promettre une IA non verifiee (Regle R05).
        status: level === 'non_supporte' ? 'draft' : 'published',
      });
    }
    variantCount += 1;
  }

  // QCM : au maximum 3 questions courtes (Regle R04). Le catalogue ne compte
  // que quelques jeux distincts, on les deduplique par cle.
  const qcm = (qcmByPrompt.get(row.id) ?? [])
    .sort((a, b) => a.order - b.order)
    .slice(0, 3)
    .map((entry) => parseQcmQuestion(entry.question));
  const qcmSignature = JSON.stringify(qcm);
  let qcmKey = qcmKeyBySignature.get(qcmSignature);
  if (!qcmKey) {
    qcmKey = `qcm-${qcmKeyBySignature.size + 1}`;
    qcmKeyBySignature.set(qcmSignature, qcmKey);
    qcmSets.push({
      key: qcmKey,
      qcm,
      // Bloc numerote tel qu'il apparait dans le prompt copiable.
      qcm_block: (qcmByPrompt.get(row.id) ?? [])
        .sort((a, b) => a.order - b.order)
        .slice(0, 3)
        .map((entry, index) => `${index + 1}. ${entry.question.trim()}`)
        .join('\n'),
    });
  }

  versionRows.push({
    external_ref: row.id,
    version_label: row.version ?? 'v1.0',
    qcm_key: qcmKey,
    qcm_trigger: override(mode, 'qcm_trigger', row.qcm_declencheur),
  });
}

// --- Generation SQL ---------------------------------------------------------
const sql = `-- =====================================================================
-- RaccourcIA - import initial du catalogue editorial
-- GENERE AUTOMATIQUEMENT par scripts/import-catalogue.mjs. Ne pas editer.
--
-- Ce fichier est idempotent : il peut etre rejoue sans creer de doublon.
-- Apres mise en production, Supabase devient la seule source de verite
-- runtime : les modifications se font dans /admin, pas ici.
--
-- Les valeurs identiques pour tous les raccourcis d'un meme mode (contexte
-- attendu, format de sortie, criteres qualite, garde-fous, QCM) sont ecrites
-- une seule fois et recomposees a l'insertion.
--
-- ${parentCategories.length} categories, ${childCategories.length} sous-categories,
-- ${promptRows.length} raccourcis, ${variantCount} variantes IA.
-- =====================================================================

begin;

-- --- Categories -------------------------------------------------------
insert into public.categories (slug, parent_id, mode, name, status, sort_order)
select d.slug, null, d.mode::public.app_mode, d.name,
       d.status::public.content_status, d.sort_order
from jsonb_to_recordset(${jsonLiteral(parentCategories)}::jsonb)
  as d(slug text, mode text, name text, status text, sort_order integer)
on conflict (slug) do update
  set name = excluded.name, mode = excluded.mode, sort_order = excluded.sort_order;

-- --- Sous-categories --------------------------------------------------
insert into public.categories (slug, parent_id, mode, name, status, sort_order)
select d.slug, p.id, d.mode::public.app_mode, d.name,
       d.status::public.content_status, d.sort_order
from jsonb_to_recordset(${jsonLiteral(childCategories)}::jsonb)
  as d(slug text, parent_slug text, mode text, name text, status text, sort_order integer)
join public.categories p on p.slug = d.parent_slug
on conflict (slug) do update
  set name = excluded.name, parent_id = excluded.parent_id, sort_order = excluded.sort_order;

-- --- Valeurs communes par mode ----------------------------------------
-- Table temporaire de la transaction : elle disparait au commit.
create temporary table seed_mode_defaults on commit drop as
select * from jsonb_to_recordset(${jsonLiteral(modeDefaults)}::jsonb)
  as d(
    mode text, expected_input text, minimal_context text, sufficient_context text,
    default_values text, expected_output text, output_format text, quality_criteria text,
    preserve_rules text, avoid_rules text, fallback_if_incomplete text,
    admin_notes text, qcm_trigger text
  );

create temporary table seed_qcm_sets on commit drop as
select * from jsonb_to_recordset(${jsonLiteral(qcmSets)}::jsonb)
  as d(key text, qcm jsonb, qcm_block text);

-- --- Raccourcis -------------------------------------------------------
insert into public.prompts (
  external_ref, command, name, slug, mode, category_id, short_description, intention,
  use_cases, tags, expected_input, minimal_context, sufficient_context,
  required_variables, optional_variables, default_values, expected_output, output_format,
  quality_criteria, preserve_rules, avoid_rules, limitations, fallback_if_incomplete,
  input_type, output_type, risk_level, priority, status, show_image_card,
  thumbnail_spec, admin_notes, sort_order, published_at
)
select
  d.external_ref, d.command::extensions.citext, d.name, d.slug, d.mode::public.app_mode, c.id,
  d.short_description, d.intention,
  coalesce(d.use_cases, '{}'), coalesce(d.tags, '{}'),
  coalesce(d.expected_input, m.expected_input),
  coalesce(d.minimal_context, m.minimal_context),
  coalesce(d.sufficient_context, m.sufficient_context),
  coalesce(d.required_variables, '{}'), coalesce(d.optional_variables, '{}'),
  coalesce(d.default_values, m.default_values),
  coalesce(d.expected_output, m.expected_output),
  coalesce(d.output_format, m.output_format),
  coalesce(d.quality_criteria, m.quality_criteria),
  coalesce(d.preserve_rules, m.preserve_rules),
  coalesce(d.avoid_rules, m.avoid_rules),
  d.limitations,
  coalesce(d.fallback_if_incomplete, m.fallback_if_incomplete),
  d.input_type::public.input_type, d.output_type::public.output_type,
  d.risk_level::public.risk_level, d.priority,
  'published'::public.content_status, coalesce(d.show_image_card, false),
  d.thumbnail_spec, coalesce(d.admin_notes, m.admin_notes), d.sort_order, now()
from jsonb_to_recordset(${jsonLiteral(promptRows)}::jsonb)
  as d(
    external_ref text, command text, name text, slug text, mode text, category_slug text,
    short_description text, intention text, use_cases text[], tags text[],
    expected_input text, minimal_context text, sufficient_context text,
    required_variables text[], optional_variables text[], default_values text,
    expected_output text, output_format text, quality_criteria text,
    preserve_rules text, avoid_rules text, limitations text, fallback_if_incomplete text,
    input_type text, output_type text, risk_level text, priority text,
    show_image_card boolean, thumbnail_spec text, admin_notes text, sort_order integer
  )
join public.categories c on c.slug = d.category_slug
join seed_mode_defaults m on m.mode = d.mode
on conflict (external_ref) do update set
  name = excluded.name, short_description = excluded.short_description,
  intention = excluded.intention, use_cases = excluded.use_cases, tags = excluded.tags,
  category_id = excluded.category_id, expected_input = excluded.expected_input,
  minimal_context = excluded.minimal_context, sufficient_context = excluded.sufficient_context,
  required_variables = excluded.required_variables,
  optional_variables = excluded.optional_variables, default_values = excluded.default_values,
  expected_output = excluded.expected_output, output_format = excluded.output_format,
  quality_criteria = excluded.quality_criteria, preserve_rules = excluded.preserve_rules,
  avoid_rules = excluded.avoid_rules, limitations = excluded.limitations,
  fallback_if_incomplete = excluded.fallback_if_incomplete,
  risk_level = excluded.risk_level, priority = excluded.priority,
  show_image_card = excluded.show_image_card, thumbnail_spec = excluded.thumbnail_spec,
  admin_notes = excluded.admin_notes;

-- --- Variantes par IA -------------------------------------------------
-- La compatibilite annoncee depend du mode, pas du raccourci : une ligne par
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
-- Les 151 payloads du catalogue suivent un modele unique : plutot que de
-- recopier 230 Ko de texte, le seed porte le modele et Postgres le remplit
-- depuis les champs deja inseres. Le texte stocke est rigoureusement celui
-- du catalogue editorial (verifie octet par octet par tests/db/run.sh).
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
    $tpl$[RaccourcIA - %s]

Role: tu executes un raccourci %s pour produire: %s.
Objectif: %s
Description: %s

Contexte et detection:
- Analyse d'abord les pieces jointes, le message utilisateur et les contraintes visibles.
- Si le contexte suffit, execute directement sans poser de question.
- Si une information indispensable manque, pose uniquement 1 a 3 QCM courts, puis attends la reponse.
- Variables a controler: %s.

QCM conditionnel a utiliser seulement si necessaire:
%s

Execution:
- Respecte strictement les informations fournies par l'utilisateur.
- N'invente pas de faits, de chiffres, de sources, de marques ou de contraintes absentes.
- Adapte la sortie au contexte final de l'utilisateur, pas a un exemple generique.
- Si une demande est impossible dans l'interface, produis le meilleur prompt final reutilisable.

A preserver: %s
A eviter: %s

Format de sortie attendu: %s
Controle qualite avant reponse: %s$tpl$,
    p.command::text, p.mode::text, p.name, p.intention, p.short_description,
    array_to_string(p.required_variables, ', '), q.qcm_block,
    p.preserve_rules, p.avoid_rules, p.output_format, p.quality_criteria
  ),
  q.qcm,
  coalesce(d.qcm_trigger, m.qcm_trigger),
  'published'::public.version_status, true, now()
from jsonb_to_recordset(${jsonLiteral(versionRows)}::jsonb)
  as d(external_ref text, version_label text, qcm_key text, qcm_trigger text)
join public.prompts p on p.external_ref = d.external_ref
join public.prompt_variants v on v.prompt_id = p.id
join seed_mode_defaults m on m.mode = p.mode::text
join seed_qcm_sets q on q.key = d.qcm_key
where not exists (
  select 1 from public.prompt_versions existing
  where existing.variant_id = v.id and existing.version_label = d.version_label
);

commit;
`;

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, sql, 'utf8');

console.log(`Categories       : ${parentCategories.length + childCategories.length}`);
console.log(`Raccourcis       : ${promptRows.length} / ${prompts.length}`);
console.log(`Variantes IA     : ${variantCount}`);
console.log(`Taille du seed   : ${(sql.length / 1024).toFixed(0)} Ko`);
console.log(`Fichier genere   : supabase/seed/catalogue.sql`);

if (warnings.length > 0) {
  console.warn(`\n${warnings.length} avertissement(s) :`);
  for (const warning of warnings) console.warn(`  - ${warning}`);
  process.exitCode = 1;
}
