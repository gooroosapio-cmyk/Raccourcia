#!/usr/bin/env node
/**
 * Genere les lots SQL d'import du catalogue V2 depuis data/catalogue/v3/*.json.
 *
 * L'import precedent avait ete applique « morceau par morceau » sans compter
 * ce qui passait : 99 raccourcis sur 250 ne sont jamais arrives en base et
 * personne ne l'a vu pendant des semaines. Ce generateur produit donc des
 * lots numerotes, chacun terminant par un controle qui leve si le compte
 * attendu n'est pas atteint. Un lot qui passe est un lot verifie.
 *
 * Tout est idempotent : rejouer un lot met a jour sans dupliquer, et sans
 * ecraser ce qu'un administrateur a change depuis (visuels envoyes, statut
 * de publication, bascule gratuit/premium).
 *
 *   node scripts/build-catalogue-v3.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'catalogue', 'v3');
const OUT = join(ROOT, 'supabase', 'seed', 'v3');

/** Delimiteur dollar-quote : evite tout echappement dans les payloads. */
const TAG = '$raccourcia$';

/** Taille d'un lot de raccourcis. Assez petit pour qu'un echec reste lisible. */
const TAILLE_LOT = 40;

const read = (nom) => JSON.parse(readFileSync(join(DATA, `${nom}.json`), 'utf8'));

const familles = read('familles');
const prompts = read('prompts');
const qcm = read('qcm');
const compat = read('compatibilite');

function litteralJson(rows) {
  const compact = rows.map((row) =>
    Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null && v !== undefined)),
  );
  const json = JSON.stringify(compact);
  if (json.includes(TAG)) {
    throw new Error(`Le delimiteur ${TAG} apparait dans les donnees.`);
  }
  return `${TAG}${json}${TAG}`;
}

/** "a; b; c" -> ["a", "b", "c"] */
const liste = (v) =>
  !v
    ? []
    : String(v)
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);

const modeDe = (domaine) => (domaine === 'IMAGE' ? 'image' : 'texte');

/**
 * Le classeur ecrit « eleve » avec ses accents ; l'enum `risk_level` est sans
 * accent depuis la premiere migration. On normalise ici plutot que d'ajouter
 * une valeur accentuee a l'enum : deux orthographes pour un meme niveau se
 * termineraient en filtres qui ne trouvent rien.
 */
const RISQUES = { faible: 'faible', moyen: 'moyen', 'élevé': 'eleve', eleve: 'eleve' };
const risqueDe = (v) => RISQUES[String(v || '').trim().toLowerCase()] ?? 'moyen';

/**
 * `input_type` et `output_type` sont des enums fermes ; le classeur y met des
 * libelles composes (« document ou texte », « texte + tableau »). On retient
 * la nature dominante, celle qui decide de l'icone et du filtre.
 */
function entreeDe(valeur) {
  const v = String(valeur || '').toLowerCase();
  if (v.includes('image') || v.includes('croquis')) return 'image';
  if (v.includes('document') || v.includes('url')) return 'document';
  if (v.includes('tableau') || v.includes('données') || v.includes('donnees')) return 'mixed';
  return 'text';
}

const sortieDe = (valeur) => (String(valeur || '').toLowerCase().includes('image') ? 'image' : 'text');

// ---------------------------------------------------------------------
// Lot 1 : les treize categories
// ---------------------------------------------------------------------

const lignesFamilles = familles.map((f) => ({
  external_ref: f.family_id,
  mode: modeDe(f.domain),
  slug: f.slug,
  name: f.name,
  short_description: f.description_short,
  description_long: f.description_long,
  sort_order: Number(f.sort_order) || 0,
  fallback_image_path: f.default_image_path,
}));

const lot1 = `-- Lot 1/${2 + Math.ceil(prompts.length / TAILLE_LOT)} : les treize categories du catalogue V2.
--
-- Elles sont creees ou mises a jour par external_ref. Les anciennes ne sont
-- pas touchees ici : la bascule de navigation est une migration separee, pour
-- que l'import puisse etre verifie avant que quoi que ce soit ne change a
-- l'ecran.
insert into public.categories
  (external_ref, mode, slug, name, short_description, description_long,
   sort_order, fallback_image_path, status, is_visible, parent_id)
select
  d.external_ref, d.mode::public.app_mode, d.slug, d.name, d.short_description,
  d.description_long, d.sort_order, d.fallback_image_path,
  -- Publiees mais invisibles : elles n'apparaitront qu'a la bascule.
  'published'::public.content_status, false, null
from jsonb_to_recordset(${litteralJson(lignesFamilles)}::jsonb) as d(
  external_ref text, mode text, slug text, name text, short_description text,
  description_long text, sort_order int, fallback_image_path text
)
on conflict (external_ref) where external_ref is not null do update
  set mode = excluded.mode,
      slug = excluded.slug,
      name = excluded.name,
      short_description = excluded.short_description,
      description_long = excluded.description_long,
      sort_order = excluded.sort_order,
      -- Un visuel envoye depuis l'administration n'est jamais ecrase par le
      -- classeur : c'est l'administrateur qui a le dernier mot sur les medias.
      fallback_image_path = coalesce(public.categories.fallback_image_path, excluded.fallback_image_path);

do $ctrl$
declare
  v_total integer;
begin
  select count(*) into v_total from public.categories where external_ref is not null;
  if v_total <> 13 then
    raise exception 'Lot 1 incomplet : % categories au lieu de 13.', v_total;
  end if;
end $ctrl$;
`;

// ---------------------------------------------------------------------
// Lots 2..n : les raccourcis, par paquets de 40
//
// Chaque raccourci est rapproche par external_ref (RCI-...). Une ligne
// existante garde son identifiant technique, donc ses favoris, son historique
// et ses evenements de copie.
// ---------------------------------------------------------------------

const lignesPrompts = prompts.map((p) => ({
  external_ref: p.id,
  command: p.command,
  slug: p.slug,
  name: p.title,
  mode: modeDe(p.domain),
  family_ref: p.family_id,
  short_description: p.short_description,
  result_summary: p.expected_output,
  intention: p.intent,
  use_cases: [p.main_use_case, p.usage_example].filter(Boolean),
  tags: liste(p.tags),
  expected_input: p.attachment_requirement,
  minimal_context: p.minimum_context,
  sufficient_context: p.sufficient_context,
  required_variables: liste(p.required_variables),
  optional_variables: liste(p.optional_variables),
  default_values: p.default_values,
  expected_output: p.expected_output,
  output_format: p.output_format,
  quality_criteria: p.quality_criteria,
  preserve_rules: p.preserve,
  avoid_rules: p.avoid,
  limitations: p.limitations,
  usage_conditions: p.usage_conditions,
  fallback_if_incomplete: p.fallback_if_incomplete,
  blocking_condition: p.blocking_condition,
  questionnaire_mode: p.questionnaire_mode,
  max_questions: Number(p.max_questions) || 0,
  input_type: entreeDe(p.input_primary),
  output_type: sortieDe(p.output_type),
  risk_level: risqueDe(p.risk_level),
  priority: p.priority,
  is_featured: p.featured === true || p.featured === 'True',
  show_image_card: p.domain === 'IMAGE',
  card_image_mode: p.card_image_mode,
  default_image_path: p.default_image_path,
  default_image_alt: p.default_image_alt,
  legacy_category: p.legacy_category,
  legacy_subcategory: p.legacy_subcategory,
  sort_order: Number(p.prompt_order) || 0,
  version_label: p.version,
  payload: p.payload_copy,
  usage_example: p.usage_example,
  test_nominal: p.test_nominal,
  test_incomplete_context: p.test_incomplete,
  test_blocking: p.test_blocked,
  catalog_version: 'v2.1',
  source_status: p.source_status,
}));

const compatParPrompt = new Map();
for (const c of compat) {
  if (!compatParPrompt.has(c.prompt_id)) compatParPrompt.set(c.prompt_id, []);
  compatParPrompt.get(c.prompt_id).push({
    external_ref: c.prompt_id,
    provider_key: c.provider_id,
    fallback_behavior: c.fallback_behavior,
    support_notes: c.support_notes,
  });
}

const qcmParPrompt = new Map();
for (const q of qcm) {
  if (!qcmParPrompt.has(q.prompt_id)) qcmParPrompt.set(q.prompt_id, []);
  qcmParPrompt.get(q.prompt_id).push({
    external_ref: q.prompt_id,
    sort_order: Number(q.order) || 1,
    variable: q.variable,
    question: q.question,
    choices: liste(q.choices ? String(q.choices).replace(/\|/g, ';') : ''),
    default_value: q.default_value,
    trigger_note: q.trigger,
  });
}

function lotPrompts(index, tranche, cumul, total) {
  const refs = new Set(tranche.map((p) => p.external_ref));
  const compatTranche = [...compatParPrompt.entries()]
    .filter(([ref]) => refs.has(ref))
    .flatMap(([, v]) => v);
  const qcmTranche = [...qcmParPrompt.entries()]
    .filter(([ref]) => refs.has(ref))
    .flatMap(([, v]) => v);

  return `-- Lot ${index} : raccourcis ${cumul - tranche.length + 1} a ${cumul} sur ${total}.
--
-- Rapprochement par external_ref : une ligne existante conserve son
-- identifiant technique, donc les favoris, l'historique et les copies deja
-- enregistrees des membres.

-- Table de travail du lot. Sans ON COMMIT DROP : psql valide chaque
-- instruction separement, la table disparaitrait avant d'avoir servi.
drop table if exists lot_prompts;
create temporary table lot_prompts as
select * from jsonb_to_recordset(${litteralJson(tranche)}::jsonb) as d(
  external_ref text, command text, slug text, name text, mode text, family_ref text,
  short_description text, result_summary text, intention text, use_cases text[], tags text[],
  expected_input text, minimal_context text, sufficient_context text,
  required_variables text[], optional_variables text[], default_values text,
  expected_output text, output_format text, quality_criteria text,
  preserve_rules text, avoid_rules text, limitations text, usage_conditions text,
  fallback_if_incomplete text, blocking_condition text, questionnaire_mode text,
  max_questions smallint, input_type text, output_type text, risk_level text,
  priority text, is_featured boolean, show_image_card boolean, card_image_mode text,
  default_image_path text, default_image_alt text, legacy_category text,
  legacy_subcategory text, sort_order int, version_label text, payload text,
  usage_example text, test_nominal text, test_incomplete_context text,
  test_blocking text, catalog_version text, source_status text
);

insert into public.prompts (
  external_ref, command, slug, name, mode, category_id, short_description, result_summary,
  intention, use_cases, tags, expected_input, minimal_context, sufficient_context,
  required_variables, optional_variables, default_values, expected_output, output_format,
  quality_criteria, preserve_rules, avoid_rules, limitations, usage_conditions,
  fallback_if_incomplete, blocking_condition, questionnaire_mode, max_questions,
  input_type, output_type, risk_level, priority, is_featured, show_image_card,
  card_image_mode, default_image_path, default_image_alt, legacy_category,
  legacy_subcategory, sort_order, usage_example, test_nominal, test_incomplete_context,
  test_blocking, catalog_version, source_status, status, published_at
)
select
  l.external_ref, l.command::extensions.citext, l.slug, l.name, l.mode::public.app_mode, c.id,
  l.short_description, l.result_summary, l.intention, l.use_cases, l.tags,
  l.expected_input, l.minimal_context, l.sufficient_context,
  l.required_variables, l.optional_variables, l.default_values, l.expected_output,
  l.output_format, l.quality_criteria, l.preserve_rules, l.avoid_rules, l.limitations,
  l.usage_conditions, l.fallback_if_incomplete, l.blocking_condition, l.questionnaire_mode,
  l.max_questions, l.input_type::public.input_type, l.output_type::public.output_type,
  l.risk_level::public.risk_level, l.priority, l.is_featured, l.show_image_card,
  l.card_image_mode::public.card_image_mode, l.default_image_path, l.default_image_alt,
  l.legacy_category, l.legacy_subcategory, l.sort_order, l.usage_example,
  l.test_nominal, l.test_incomplete_context, l.test_blocking, l.catalog_version,
  l.source_status, 'published'::public.content_status, now()
from lot_prompts l
join public.categories c on c.external_ref = l.family_ref
on conflict (external_ref) do update
  set command = excluded.command,
      slug = excluded.slug,
      name = excluded.name,
      mode = excluded.mode,
      category_id = excluded.category_id,
      short_description = excluded.short_description,
      result_summary = excluded.result_summary,
      intention = excluded.intention,
      use_cases = excluded.use_cases,
      tags = excluded.tags,
      expected_input = excluded.expected_input,
      minimal_context = excluded.minimal_context,
      sufficient_context = excluded.sufficient_context,
      required_variables = excluded.required_variables,
      optional_variables = excluded.optional_variables,
      default_values = excluded.default_values,
      expected_output = excluded.expected_output,
      output_format = excluded.output_format,
      quality_criteria = excluded.quality_criteria,
      preserve_rules = excluded.preserve_rules,
      avoid_rules = excluded.avoid_rules,
      limitations = excluded.limitations,
      usage_conditions = excluded.usage_conditions,
      fallback_if_incomplete = excluded.fallback_if_incomplete,
      blocking_condition = excluded.blocking_condition,
      questionnaire_mode = excluded.questionnaire_mode,
      max_questions = excluded.max_questions,
      input_type = excluded.input_type,
      output_type = excluded.output_type,
      risk_level = excluded.risk_level,
      priority = excluded.priority,
      is_featured = excluded.is_featured,
      show_image_card = excluded.show_image_card,
      card_image_mode = excluded.card_image_mode,
      -- Le classeur ne pose le chemin que s'il n'y en a pas encore : un visuel
      -- envoye depuis l'administration reste maitre.
      default_image_path = coalesce(public.prompts.default_image_path, excluded.default_image_path),
      default_image_alt = coalesce(public.prompts.default_image_alt, excluded.default_image_alt),
      legacy_category = excluded.legacy_category,
      legacy_subcategory = excluded.legacy_subcategory,
      sort_order = excluded.sort_order,
      usage_example = excluded.usage_example,
      test_nominal = excluded.test_nominal,
      test_incomplete_context = excluded.test_incomplete_context,
      test_blocking = excluded.test_blocking,
      catalog_version = excluded.catalog_version,
      source_status = excluded.source_status;
      -- "status" et "is_free" ne sont jamais touches : masquer un raccourci ou
      -- l'offrir sont des decisions d'administration, pas du classeur.

-- Une variante par IA. Le meme payload sert les trois : le classeur ne
-- decline plus le contenu par fournisseur, il decline la conduite a tenir.
insert into public.prompt_variants (prompt_id, provider_id, compatibility, status, fallback_behavior, support_notes)
select p.id, ia.id,
       case when d.fallback_behavior = 'declare_unavailable_if_no_image_tool'
            then 'partiel'::public.compatibility_level
            else 'excellent'::public.compatibility_level end,
       'published'::public.content_status,
       d.fallback_behavior::public.fallback_behavior,
       d.support_notes
from jsonb_to_recordset(${litteralJson(compatTranche)}::jsonb) as d(
  external_ref text, provider_key text, fallback_behavior text, support_notes text
)
join public.prompts p on p.external_ref = d.external_ref
join public.ai_providers ia on ia.key = d.provider_key
on conflict (prompt_id, provider_id) do update
  set compatibility = excluded.compatibility,
      status = excluded.status,
      fallback_behavior = excluded.fallback_behavior,
      support_notes = excluded.support_notes;

-- Le payload du classeur devient la version courante. Les precedentes sont
-- conservees et retirees du courant : une version publiee reste tracable.
--
-- Trois instructions et non une seule : l'index unique n'admet qu'une version
-- courante par variante, et une CTE qui retire l'ancienne pendant qu'elle
-- insere la nouvelle les fait exister ensemble le temps de l'instruction.

-- 1. Retirer la version courante dont le payload a change.
update public.prompt_versions pv
set is_current = false, status = 'retired'::public.version_status
from lot_prompts l
join public.prompts p on p.external_ref = l.external_ref
join public.prompt_variants v on v.prompt_id = p.id
where pv.variant_id = v.id
  and pv.is_current
  and pv.payload is distinct from l.payload;

-- 2. Inserer le nouveau payload, s'il n'a jamais ete enregistre.
insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
select v.id, l.version_label, l.payload, 'published'::public.version_status, true, now()
from lot_prompts l
join public.prompts p on p.external_ref = l.external_ref
join public.prompt_variants v on v.prompt_id = p.id
where not exists (
  select 1 from public.prompt_versions pv
  where pv.variant_id = v.id and pv.payload = l.payload
);

-- 3. Un payload identique deja archive redevient simplement le courant.
update public.prompt_versions pv
set is_current = true, status = 'published'::public.version_status
from lot_prompts l
join public.prompts p on p.external_ref = l.external_ref
join public.prompt_variants v on v.prompt_id = p.id
where pv.variant_id = v.id
  and pv.payload = l.payload
  and not pv.is_current
  and not exists (
    select 1 from public.prompt_versions autre
    where autre.variant_id = v.id and autre.is_current
  );

-- Questions contextuelles : remplacees en bloc pour ce lot, car leur ordre
-- fait partie de leur sens.
delete from public.prompt_questions q
using lot_prompts l
join public.prompts p on p.external_ref = l.external_ref
where q.prompt_id = p.id;

insert into public.prompt_questions (prompt_id, sort_order, variable, question, choices, default_value, trigger_note)
select p.id, d.sort_order, d.variable, d.question, to_jsonb(d.choices), d.default_value, d.trigger_note
from jsonb_to_recordset(${litteralJson(qcmTranche)}::jsonb) as d(
  external_ref text, sort_order smallint, variable text, question text,
  choices text[], default_value text, trigger_note text
)
join public.prompts p on p.external_ref = d.external_ref;

do $ctrl$
declare
  v_total integer;
begin
  select count(*) into v_total from public.prompts where catalog_version = 'v2.1';
  if v_total < ${cumul} then
    raise exception 'Lot ${index} incomplet : % raccourcis importes au lieu de ${cumul}.', v_total;
  end if;
end $ctrl$;

drop table lot_prompts;
`;
}

// ---------------------------------------------------------------------
// Ecriture
// ---------------------------------------------------------------------

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const fichiers = [];
const ecrire = (nom, contenu) => {
  writeFileSync(join(OUT, nom), contenu, 'utf8');
  fichiers.push({ nom, taille: contenu.length });
};

ecrire('01_categories.sql', lot1);

const nbLots = Math.ceil(lignesPrompts.length / TAILLE_LOT);
let cumul = 0;
for (let i = 0; i < nbLots; i += 1) {
  const tranche = lignesPrompts.slice(i * TAILLE_LOT, (i + 1) * TAILLE_LOT);
  cumul += tranche.length;
  const numero = String(i + 2).padStart(2, '0');
  ecrire(`${numero}_prompts_${numero}.sql`, lotPrompts(i + 2, tranche, cumul, lignesPrompts.length));
}

console.log(`${fichiers.length} lots ecrits dans supabase/seed/v3/`);
for (const f of fichiers) {
  console.log(`  ${f.nom.padEnd(24)} ${(f.taille / 1024).toFixed(0)} Ko`);
}
console.log(`\nTotal : ${lignesPrompts.length} raccourcis, ${qcm.length} questions, ${compat.length} regles de compatibilite.`);
