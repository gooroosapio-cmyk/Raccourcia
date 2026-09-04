#!/usr/bin/env node
/**
 * Genere supabase/seed/catalogue.sql a partir de data/catalogue/*.json.
 *
 * Le fichier produit est idempotent : le rejouer met a jour les lignes
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

const read = (name) => JSON.parse(readFileSync(join(DATA, name), 'utf8'));

const prompts = read('prompts.json');
const qcmRows = read('qcm.json');
const taxonomy = read('taxonomie-map.json');

/** Echappe une valeur pour une chaine SQL, ou retourne NULL. */
function sql(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** Construit un litteral text[] Postgres. */
function sqlArray(values) {
  const items = (values ?? []).filter(Boolean);
  if (items.length === 0) return "'{}'::text[]";
  return `ARRAY[${items.map(sql).join(', ')}]::text[]`;
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

/** family (tableur) -> { categorySlug, mode } */
const familyIndex = new Map();
const categories = [];

for (const [domain, config] of Object.entries(taxonomy.modes)) {
  let order = 0;
  for (const group of config.groups) {
    order += 1;
    categories.push({
      slug: group.slug,
      parentSlug: null,
      mode: config.mode,
      name: group.name,
      status: config.status,
      sortOrder: order,
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
      categories.push({
        slug: childSlug,
        parentSlug: group.slug,
        mode: config.mode,
        name: familyLabel(family),
        status: config.status,
        sortOrder: childOrder,
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

// --- Generation ------------------------------------------------------------
const lines = [];
const warnings = [];

lines.push(
  '-- =====================================================================',
  '-- RaccourcIA - import initial du catalogue editorial',
  '-- GENERE AUTOMATIQUEMENT par scripts/import-catalogue.mjs. Ne pas editer.',
  '--',
  '-- Ce fichier est idempotent : il peut etre rejoue sans creer de doublon.',
  '-- Apres mise en production, Supabase devient la seule source de verite',
  '-- runtime : les modifications se font dans /admin, pas ici.',
  '-- =====================================================================',
  '',
  'begin;',
  '',
  '-- --- Categories -------------------------------------------------------',
);

for (const category of categories.filter((c) => !c.parentSlug)) {
  lines.push(
    `insert into public.categories (slug, parent_id, mode, name, status, sort_order) values (` +
      `${sql(category.slug)}, null, ${sql(category.mode)}::public.app_mode, ` +
      `${sql(category.name)}, ${sql(category.status)}::public.content_status, ${category.sortOrder})`,
    `on conflict (slug) do update set name = excluded.name, ` +
      `sort_order = excluded.sort_order, mode = excluded.mode;`,
  );
}

lines.push('', '-- --- Sous-categories --------------------------------------------------');
for (const category of categories.filter((c) => c.parentSlug)) {
  lines.push(
    `insert into public.categories (slug, parent_id, mode, name, status, sort_order) ` +
      `select ${sql(category.slug)}, p.id, ${sql(category.mode)}::public.app_mode, ` +
      `${sql(category.name)}, ${sql(category.status)}::public.content_status, ${category.sortOrder} ` +
      `from public.categories p where p.slug = ${sql(category.parentSlug)}`,
    `on conflict (slug) do update set name = excluded.name, ` +
      `sort_order = excluded.sort_order, parent_id = excluded.parent_id;`,
  );
}

lines.push('', '-- --- Raccourcis -------------------------------------------------------');

let promptCount = 0;
let variantCount = 0;

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
  const inputType = isImage ? 'image' : row.domain === 'analyser' ? 'document' : 'text';
  const outputType = isImage ? 'image' : row.domain === 'analyser' ? 'analysis' : 'text';
  const useCases = splitList(row.exemples_usage, '|').length
    ? splitList(row.exemples_usage, '|')
    : splitList(row.exemples_usage, ';');

  promptCount += 1;

  lines.push(
    '',
    `-- ${row.id} ${command}`,
    `insert into public.prompts (`,
    `  external_ref, command, name, slug, mode, category_id, short_description, intention,`,
    `  use_cases, tags, expected_input, minimal_context, sufficient_context,`,
    `  required_variables, optional_variables, default_values, expected_output, output_format,`,
    `  quality_criteria, preserve_rules, avoid_rules, limitations, fallback_if_incomplete,`,
    `  input_type, output_type, risk_level, priority, status, show_image_card,`,
    `  thumbnail_spec, admin_notes, sort_order, published_at`,
    `)`,
    `select`,
    `  ${sql(row.id)}, ${sql(command)}, ${sql(row.title)}, ${sql(slugify(command.slice(1)))},`,
    `  ${sql(mode)}::public.app_mode, c.id, ${sql(row.description_courte)}, ${sql(row.intention)},`,
    `  ${sqlArray(useCases)}, ${sqlArray(splitList(row.tags))},`,
    `  ${sql(row.entree_attendue)}, ${sql(row.contexte_minimal)}, ${sql(row.contexte_suffisant)},`,
    `  ${sqlArray(splitList(row.variables_requises))}, ${sqlArray(splitList(row.variables_optionnelles))},`,
    `  ${sql(row.valeurs_defaut)}, ${sql(row.sortie_attendue)}, ${sql(row.format_sortie)},`,
    `  ${sql(row.criteres_qualite)}, ${sql(row.a_preserver)}, ${sql(row.a_eviter)},`,
    `  ${sql(row.limites)}, ${sql(row.fallback_si_incomplet)},`,
    `  ${sql(inputType)}::public.input_type, ${sql(outputType)}::public.output_type,`,
    `  ${sql(row.niveau_risque ?? 'faible')}::public.risk_level, ${sql(row.priorite_v1 ?? 'P0')},`,
    `  'published'::public.content_status, ${isImage},`,
    `  ${sql(row.thumbnail_spec)}, ${sql(row.admin_notes)}, ${promptCount}, now()`,
    `from public.categories c where c.slug = ${sql(categorySlug)}`,
    `on conflict (external_ref) do update set`,
    `  name = excluded.name, short_description = excluded.short_description,`,
    `  intention = excluded.intention, use_cases = excluded.use_cases, tags = excluded.tags,`,
    `  category_id = excluded.category_id, expected_input = excluded.expected_input,`,
    `  minimal_context = excluded.minimal_context, sufficient_context = excluded.sufficient_context,`,
    `  required_variables = excluded.required_variables,`,
    `  optional_variables = excluded.optional_variables, default_values = excluded.default_values,`,
    `  expected_output = excluded.expected_output, output_format = excluded.output_format,`,
    `  quality_criteria = excluded.quality_criteria, preserve_rules = excluded.preserve_rules,`,
    `  avoid_rules = excluded.avoid_rules, limitations = excluded.limitations,`,
    `  fallback_if_incomplete = excluded.fallback_if_incomplete,`,
    `  risk_level = excluded.risk_level, priority = excluded.priority,`,
    `  show_image_card = excluded.show_image_card, thumbnail_spec = excluded.thumbnail_spec,`,
    `  admin_notes = excluded.admin_notes;`,
  );

  // QCM : au maximum 3 questions courtes (regle R04).
  const qcm = (qcmByPrompt.get(row.id) ?? [])
    .sort((a, b) => a.order - b.order)
    .slice(0, 3)
    .map((entry) => parseQcmQuestion(entry.question));
  const qcmJson = sql(JSON.stringify(qcm));

  // Le payload initial est identique pour les trois IA : on ne l'ecrit qu'une
  // fois dans le fichier, les autres variantes le copient en base. L'admin
  // pourra ensuite faire diverger une version par IA depuis /admin.
  const [referenceProvider, ...otherProviders] = PROVIDERS;
  const versionLabel = row.version ?? 'v1.0';

  const emitVariant = (provider) => {
    const { level, note } = compatibility(row[`compat_${provider}`]);
    const variantStatus = level === 'non_supporte' ? 'draft' : 'published';
    variantCount += 1;
    lines.push(
      `insert into public.prompt_variants (prompt_id, provider_id, compatibility, compatibility_note, status)`,
      `select p.id, pr.id, ${sql(level)}::public.compatibility_level, ${sql(note)},`,
      `  ${sql(variantStatus)}::public.content_status`,
      `from public.prompts p, public.ai_providers pr`,
      `where p.external_ref = ${sql(row.id)} and pr.key = ${sql(provider)}`,
      `on conflict (prompt_id, provider_id) do update set`,
      `  compatibility = excluded.compatibility, compatibility_note = excluded.compatibility_note,`,
      `  status = excluded.status;`,
    );
  };

  const versionGuard = () => [
    `  and not exists (`,
    `    select 1 from public.prompt_versions existing`,
    `    where existing.variant_id = v.id and existing.version_label = ${sql(versionLabel)}`,
    `  );`,
  ];

  emitVariant(referenceProvider);
  lines.push(
    `insert into public.prompt_versions (variant_id, version_label, payload, qcm, qcm_trigger, status, is_current, published_at)`,
    `select v.id, ${sql(versionLabel)}, ${sql(row.payload_copiable)}, ${qcmJson}::jsonb,`,
    `  ${sql(row.qcm_declencheur)}, 'published'::public.version_status, true, now()`,
    `from public.prompt_variants v`,
    `join public.prompts p on p.id = v.prompt_id`,
    `join public.ai_providers pr on pr.id = v.provider_id`,
    `where p.external_ref = ${sql(row.id)} and pr.key = ${sql(referenceProvider)}`,
    ...versionGuard(),
  );

  for (const provider of otherProviders) {
    emitVariant(provider);
    lines.push(
      `insert into public.prompt_versions (variant_id, version_label, payload, qcm, qcm_trigger, status, is_current, published_at)`,
      `select v.id, ${sql(versionLabel)}, src.payload, src.qcm, src.qcm_trigger,`,
      `  'published'::public.version_status, true, now()`,
      `from public.prompt_variants v`,
      `join public.prompts p on p.id = v.prompt_id`,
      `join public.ai_providers pr on pr.id = v.provider_id`,
      `join public.prompt_variants ref on ref.prompt_id = p.id`,
      `join public.ai_providers refpr on refpr.id = ref.provider_id and refpr.key = ${sql(referenceProvider)}`,
      `join public.prompt_versions src on src.variant_id = ref.id`,
      `  and src.version_label = ${sql(versionLabel)}`,
      `where p.external_ref = ${sql(row.id)} and pr.key = ${sql(provider)}`,
      ...versionGuard(),
    );
  }
}

lines.push('', 'commit;', '');

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, lines.join('\n'), 'utf8');

console.log(`Categories       : ${categories.length}`);
console.log(`Raccourcis       : ${promptCount} / ${prompts.length}`);
console.log(`Variantes IA     : ${variantCount}`);
console.log(`Fichier genere   : supabase/seed/catalogue.sql`);

if (warnings.length > 0) {
  console.warn(`\n${warnings.length} avertissement(s) :`);
  for (const warning of warnings) console.warn(`  - ${warning}`);
  process.exitCode = 1;
}
