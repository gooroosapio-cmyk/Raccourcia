#!/usr/bin/env node
/**
 * Genere les lots SQL de l'extension IMAGE V5.1 depuis data/catalogue/v5-1/.
 *
 *   node scripts/build-catalogue-v5-1.mjs
 *
 * Cinquante commandes IMAGE qui rejoignent les six familles existantes. Ce
 * generateur differe de celui de la V5 sur un point qui change tout : il
 * n'ecrit que des lignes neuves. Aucune commande existante n'est mise a
 * jour, aucun payload remplace, aucun questionnaire efface. Un identifiant
 * deja pris fait passer sa ligne, il ne l'ecrase pas.
 *
 * Les commandes arrivent en brouillon. Le classeur demande une recette
 * moteur et une relecture humaine des transformations sensibles avant
 * publication : elles n'apparaissent donc nulle part tant que
 * l'administration ne les publie pas.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'catalogue', 'v5-1');
const OUT = join(ROOT, 'supabase', 'seed', 'v5-1');

const TAG = '$raccourcia$';
const VERSION = 'v5-1-extension';
const CATALOGUE = 'v5.1';

const lire = (nom) => JSON.parse(readFileSync(join(DATA, `${nom}.json`), 'utf8'));

const commandes = lire('commandes');
const payloads = lire('payloads');
const questions = lire('questions');

function litteralJson(rows) {
  const json = JSON.stringify(rows);
  if (json.includes(TAG)) throw new Error(`Le delimiteur ${TAG} apparait dans les donnees.`);
  return `${TAG}${json}${TAG}`;
}

/** `input_type` est un enum ferme ; le classeur y met des libelles composes. */
function entreeDe(valeur) {
  const v = String(valeur || '').toLowerCase();
  if (v.includes('image') || v.includes('croquis')) return 'image';
  if (v.includes('document')) return 'mixed';
  return 'text';
}

const questionsParRef = new Map();
for (const q of questions) {
  questionsParRef.set(q.ref, (questionsParRef.get(q.ref) ?? 0) + 1);
}

const lignes = commandes.map((c) => ({
  ref: c.ref,
  command: c.command,
  slug: c.command.replace(/^\//, ''),
  family_id: c.family_id,
  title: c.title,
  short_description: c.short_description,
  main_use_case: c.main_use_case,
  level: c.level,
  preset_key: c.preset_key,
  aliases: c.aliases,
  required_variables: c.required_variables,
  optional_variables: c.optional_variables,
  sufficient_context: c.sufficient_context,
  blocking_condition: c.blocking_condition,
  default_values: c.default_values,
  preserve: c.preserve,
  avoid: c.avoid,
  output_format: c.output_format,
  risk_level: c.risk_level,
  input_type: entreeDe(c.input_primary),
  max_questions: questionsParRef.get(c.ref) ?? null,
}));

const CHAMPS = `ref text, command text, slug text, family_id text, title text,
  short_description text, main_use_case text, level text, preset_key text,
  aliases text[], required_variables text[], optional_variables text[],
  sufficient_context text, blocking_condition text, default_values text,
  preserve text, avoid text, output_format text, risk_level text,
  input_type text, max_questions smallint`;

function lotCommandes(numero, tranche, cumul, total) {
  return `-- Lot ${numero} : commandes ${cumul - tranche.length + 1} a ${cumul} sur ${total}.
--
-- Insertion seule. Une commande dont l'identifiant existe deja passe son
-- tour : ce lot ne peut rien ecraser, et c'est ce qui le distingue de
-- l'import V5, qui reecrivait 433 fiches.
--
-- Elles arrivent en brouillon, sans visuel. Le classeur demande une recette
-- moteur et une relecture humaine avant publication ; l'administration les
-- publiera quand elle l'aura faite.

drop table if exists lot_v5_1;
create temporary table lot_v5_1 as
select * from jsonb_to_recordset(${litteralJson(tranche)}::jsonb) as d(
  ${CHAMPS}
);

insert into public.prompts (
  external_ref, command, slug, name, mode, category_id, short_description,
  use_cases, intention, aliases, level, preset_key,
  required_variables, optional_variables, sufficient_context, blocking_condition,
  default_values, preserve_rules, avoid_rules, output_format,
  input_type, output_type, risk_level, show_image_card, catalog_version,
  status, max_questions, questionnaire_mode
)
select
  l.ref, l.command::extensions.citext, l.slug, l.title, 'image'::public.app_mode, f.id,
  l.short_description, array[l.main_use_case], l.main_use_case, l.aliases,
  l.level::public.execution_level, l.preset_key,
  l.required_variables, l.optional_variables, l.sufficient_context, l.blocking_condition,
  l.default_values, l.preserve, l.avoid, l.output_format,
  l.input_type::public.input_type, 'image'::public.output_type,
  l.risk_level::public.risk_level, true, '${CATALOGUE}',
  'draft'::public.content_status, l.max_questions, 'successif'
from lot_v5_1 l
join public.categories f on f.external_ref = l.family_id
where not exists (select 1 from public.prompts p where p.external_ref = l.ref)
  and not exists (select 1 from public.prompts p where p.command = l.command::extensions.citext);

-- Trois variantes par commande : sans elles, aucun payload ne peut etre pose.
insert into public.prompt_variants (prompt_id, provider_id, compatibility, status, fallback_behavior)
select p.id, ia.id, 'excellent'::public.compatibility_level,
       'published'::public.content_status,
       'declare_unavailable_if_no_image_tool'::public.fallback_behavior
from lot_v5_1 l
join public.prompts p on p.external_ref = l.ref
cross join public.ai_providers ia
on conflict (prompt_id, provider_id) do nothing;

do $ctrl$
declare
  v_posees integer;
  v_attendues integer;
begin
  select count(*) into v_attendues from lot_v5_1;
  select count(*) into v_posees
  from lot_v5_1 l join public.prompts p on p.external_ref = l.ref;
  if v_posees <> v_attendues then
    raise exception 'Lot ${numero} : % commandes sur % posees. Un identifiant ou un nom etait deja pris.',
      v_posees, v_attendues;
  end if;
end $ctrl$;

drop table lot_v5_1;
`;
}

function lotPayloads(numero, tranche, cumul, total) {
  return `-- Lot ${numero} : payloads ${cumul - tranche.length + 1} a ${cumul} sur ${total}.
--
-- Un texte propre a chaque IA. Les commandes etant neuves, aucune version
-- courante n'existe : rien n'est retire, tout est pose.

drop table if exists lot_v5_1_payloads;
create temporary table lot_v5_1_payloads as
select * from jsonb_to_recordset(${litteralJson(tranche)}::jsonb) as x(
  ref text, moteur text, payload text, sha256 text
);

insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
select v.id, '${VERSION}', l.payload, 'published'::public.version_status, true, now()
from lot_v5_1_payloads l
join public.prompts p on p.external_ref = l.ref
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers pr on pr.id = v.provider_id and pr.key = l.moteur
where not exists (
  select 1 from public.prompt_versions pv where pv.variant_id = v.id and pv.is_current
);

do $ctrl$
declare
  v_pose integer;
begin
  select count(*) into v_pose
  from lot_v5_1_payloads l
  join public.prompts p on p.external_ref = l.ref
  join public.prompt_variants v on v.prompt_id = p.id
  join public.ai_providers pr on pr.id = v.provider_id and pr.key = l.moteur
  join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
  where pv.payload = l.payload;
  if v_pose <> ${tranche.length} then
    raise exception 'Lot ${numero} : % payloads courants sur ${tranche.length}.', v_pose;
  end if;
end $ctrl$;

drop table lot_v5_1_payloads;
`;
}

const lignesQuestions = questions.map((q) => ({
  ref: q.ref,
  sort_order: q.sort_order,
  variable: `reponse_${q.sort_order}`,
  question: q.question,
  trigger_note: q.condition,
}));

const lotQuestions = `-- Lot 800 : les ${lignesQuestions.length} questions successives de l'extension.
--
-- Posees seulement pour les commandes de l'extension, et seulement si elles
-- n'en ont pas deja : ce lot n'efface aucun questionnaire existant.

insert into public.prompt_questions (prompt_id, sort_order, variable, question, choices, trigger_note)
select p.id, d.sort_order, d.variable, d.question, '[]'::jsonb, d.trigger_note
from jsonb_to_recordset(${litteralJson(lignesQuestions)}::jsonb) as d(
  ref text, sort_order smallint, variable text, question text, trigger_note text
)
join public.prompts p on p.external_ref = d.ref and p.catalog_version = '${CATALOGUE}'
where not exists (
  select 1 from public.prompt_questions q
  where q.prompt_id = p.id and q.sort_order = d.sort_order
);

do $ctrl$
declare
  v_total integer;
begin
  select count(*) into v_total
  from public.prompt_questions q
  join public.prompts p on p.id = q.prompt_id and p.catalog_version = '${CATALOGUE}';
  if v_total <> ${lignesQuestions.length} then
    raise exception 'Lot 800 : % questions au lieu de ${lignesQuestions.length}.', v_total;
  end if;

  -- Le plafond annonce doit valoir ce que la commande peut poser.
  select count(*) into v_total
  from public.prompts p
  where p.catalog_version = '${CATALOGUE}'
    and coalesce(p.max_questions, 0)
        <> (select count(*) from public.prompt_questions q where q.prompt_id = p.id);
  if v_total > 0 then
    raise exception '% commandes de l''extension annoncent un plafond faux.', v_total;
  end if;
end $ctrl$;
`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const fichiers = [];
const ecrire = (nom, contenu) => {
  writeFileSync(join(OUT, nom), contenu, 'utf8');
  fichiers.push(nom);
};

const TAILLE_COMMANDES = 25;
let cumul = 0;
for (let i = 0; i * TAILLE_COMMANDES < lignes.length; i += 1) {
  const tranche = lignes.slice(i * TAILLE_COMMANDES, (i + 1) * TAILLE_COMMANDES);
  cumul += tranche.length;
  const numero = String(100 + i + 1);
  ecrire(
    `${numero}_commandes_${String(i + 1).padStart(2, '0')}.sql`,
    lotCommandes(numero, tranche, cumul, lignes.length),
  );
}

const TAILLE_PAYLOADS = 30;
cumul = 0;
for (let i = 0; i * TAILLE_PAYLOADS < payloads.length; i += 1) {
  const tranche = payloads.slice(i * TAILLE_PAYLOADS, (i + 1) * TAILLE_PAYLOADS);
  cumul += tranche.length;
  const numero = String(200 + i + 1);
  ecrire(
    `${numero}_payloads_${String(i + 1).padStart(2, '0')}.sql`,
    lotPayloads(numero, tranche, cumul, payloads.length),
  );
}

ecrire('800_questions.sql', lotQuestions);

console.log(`${fichiers.length} lots ecrits dans supabase/seed/v5-1/`);
