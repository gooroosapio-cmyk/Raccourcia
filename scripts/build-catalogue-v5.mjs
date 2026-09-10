#!/usr/bin/env node
/**
 * Genere les lots SQL d'import du catalogue V5 depuis data/catalogue/v5/*.json.
 *
 *   node scripts/build-catalogue-v5.mjs
 *
 * Ce que ces lots font : ils remplacent le texte editorial, les payloads par
 * moteur et les questions des 433 commandes canoniques, creent les deux
 * missions nouvelles, et enregistrent les 131 alias.
 *
 * Ce qu'ils ne font pas, et c'est deliberé :
 *   - ils ne rangent aucune commande existante dans une famille V5. Les
 *     familles V5 sont invisibles ; y deplacer une commande publiee la ferait
 *     disparaitre du catalogue a la seconde ou le lot passe. Le rangement est
 *     la matiere de la bascule, qui publie les familles et deplace les
 *     commandes dans la meme transaction.
 *   - ils ne touchent ni au statut, ni au palier gratuit, ni a un seul champ
 *     media : ce sont des decisions d'administration.
 *   - ils ne suppriment aucune version de payload : l'ancienne sort du
 *     courant et reste consultable.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'catalogue', 'v5');
const OUT = join(ROOT, 'supabase', 'seed', 'v5');

/** Delimiteur dollar-quote : evite tout echappement dans les payloads. */
const TAG = '$raccourcia$';

/** Etiquette de version posee sur chaque payload du lot. */
const VERSION = 'v5-final';

const lire = (nom) => JSON.parse(readFileSync(join(DATA, `${nom}.json`), 'utf8'));

const familles = lire('familles');
const commandes = lire('commandes');
const payloads = lire('payloads');
const questions = lire('questions');
const alias = lire('alias');

function litteralJson(rows) {
  const json = JSON.stringify(rows);
  if (json.includes(TAG)) throw new Error(`Le delimiteur ${TAG} apparait dans les donnees.`);
  return `${TAG}${json}${TAG}`;
}

const modeDe = (domaine) => (domaine === 'IMAGE' ? 'image' : 'texte');

/**
 * `input_type` est un enum ferme ; le classeur y met des libelles composes
 * (« texte, document ou donnees selon la mission »). On retient la nature
 * dominante, celle qui decide de l'icone et du filtre.
 */
function entreeDe(valeur) {
  const v = String(valeur || '').toLowerCase();
  if (v.includes('image') || v.includes('croquis')) return 'image';
  if (v.includes('document')) return 'mixed';
  return 'text';
}

// ---------------------------------------------------------------------
// Lot 001 : le texte long des quatorze familles
//
// Les familles elles-memes sont posees par la migration du socle. Ce lot ne
// fait que leur donner leur description longue, sans toucher au visuel de
// repli ni au statut : elles restent invisibles jusqu'a la bascule.
// ---------------------------------------------------------------------

const lotFamilles = `-- Lot 001 : description longue des quatorze familles V5.
--
-- Les familles existent deja (migration du socle V5). Ce lot ne change que
-- leur texte : ni le statut, ni la visibilite, ni le visuel de repli, dont
-- l'administration reste maitre.

update public.categories c
set name = d.name,
    short_description = d.short_description,
    description_long = d.description_long,
    sort_order = d.sort_order
from jsonb_to_recordset(${litteralJson(familles)}::jsonb) as d(
  family_id text, domain text, name text, short_description text,
  description_long text, sort_order int
)
where c.external_ref = d.family_id;

do $ctrl$
declare
  v_total integer;
begin
  select count(*) into v_total from public.categories
  where external_ref like '%-V5-%' and coalesce(description_long, '') <> '';
  if v_total <> 14 then
    raise exception 'Lot 001 incomplet : % familles V5 decrites au lieu de 14.', v_total;
  end if;
end $ctrl$;
`;

// ---------------------------------------------------------------------
// Lots 1xx : les 433 commandes canoniques
// ---------------------------------------------------------------------

/**
 * Nombre de questions successives par commande.
 *
 * Le plafond annonce au modele doit valoir exactement ce que la commande peut
 * poser : au-dessus, le prompt promet une question qui n'existe pas ; en
 * dessous, il s'interdit une question utile. Quarante et une commandes V5
 * n'en posent aucune — elles portent `null`, la contrainte en base
 * n'admettant que 1 a 3.
 */
const questionsParRef = new Map();
for (const q of questions) {
  questionsParRef.set(q.ref, (questionsParRef.get(q.ref) ?? 0) + 1);
}

const lignesCommandes = commandes.map((c) => ({
  ref: c.ref,
  command: c.command,
  slug: c.command.replace(/^\//, ''),
  family_id: c.family_id,
  title: c.title,
  short_description: c.short_description,
  main_use_case: c.main_use_case,
  level: c.level,
  preset_key: c.preset_key,
  required_variables: c.required_variables,
  optional_variables: c.optional_variables,
  sufficient_context: c.sufficient_context,
  blocking_condition: c.blocking_condition,
  default_values: c.default_values,
  preserve: c.preserve,
  avoid: c.avoid,
  output_format: c.output_format,
  risk_level: c.risk_level,
  mode: modeDe(c.domain),
  input_type: entreeDe(c.input_primary),
  output_type: c.domain === 'IMAGE' ? 'image' : 'text',
  max_questions: questionsParRef.get(c.ref) ?? null,
  questionnaire_mode: 'successif',
}));

const CHAMPS_COMMANDE = `ref text, command text, slug text, family_id text, title text,
  short_description text, main_use_case text, level text, preset_key text,
  required_variables text[], optional_variables text[], sufficient_context text,
  blocking_condition text, default_values text, preserve text, avoid text,
  output_format text, risk_level text, mode text, input_type text, output_type text,
  max_questions smallint, questionnaire_mode text`;

function lotCommandes(numero, tranche, cumul, total) {
  return `-- Lot ${numero} : commandes canoniques ${cumul - tranche.length + 1} a ${cumul} sur ${total}.
--
-- Rapprochement par external_ref. Une commande deja en base garde son
-- identifiant technique, donc ses favoris, son historique de copie, ses
-- visuels et son rangement actuel.
--
-- Quinze commandes changent de nom ici : leur mission s'elargit et le
-- classeur leur donne un nom plus juste (/emailpro devient /messagepro).
-- L'adresse publique, elle, ne bouge pas : le slug n'est jamais reecrit, donc
-- un lien deja partage continue de repondre.

drop table if exists lot_v5_commandes;
create temporary table lot_v5_commandes as
select * from jsonb_to_recordset(${litteralJson(tranche)}::jsonb) as d(
  ${CHAMPS_COMMANDE}
);

-- 1. Les missions que le catalogue ne connait pas encore. Elles arrivent en
--    brouillon, rangees dans leur famille V5 : invisibles des deux cotes.
insert into public.prompts (
  external_ref, command, slug, name, mode, category_id, short_description, use_cases,
  level, preset_key, required_variables, optional_variables, sufficient_context,
  blocking_condition, default_values, preserve_rules, avoid_rules, output_format,
  input_type, output_type, risk_level, show_image_card, catalog_version, status,
  max_questions, questionnaire_mode
)
select
  l.ref, l.command::extensions.citext, l.slug, l.title, l.mode::public.app_mode, c.id,
  l.short_description, array[l.main_use_case],
  l.level::public.execution_level, l.preset_key,
  l.required_variables, l.optional_variables, l.sufficient_context,
  l.blocking_condition, l.default_values, l.preserve, l.avoid, l.output_format,
  l.input_type::public.input_type, l.output_type::public.output_type,
  l.risk_level::public.risk_level, l.mode = 'image', 'v5.0',
  'draft'::public.content_status, l.max_questions, l.questionnaire_mode
from lot_v5_commandes l
join public.categories c on c.external_ref = l.family_id
where not exists (select 1 from public.prompts p where p.external_ref = l.ref);

-- 2. Les commandes deja en place recoivent le texte du classeur.
--
--    Ne sont volontairement pas touches : category_id (la bascule s'en
--    charge), status, is_free, is_pinned, is_featured, is_new, et tous les
--    champs media. Le classeur est la source du texte, pas des decisions
--    d'exploitation ni des visuels.
update public.prompts p
set command = l.command::extensions.citext,
    name = l.title,
    short_description = l.short_description,
    use_cases = array[l.main_use_case],
    level = l.level::public.execution_level,
    preset_key = l.preset_key,
    required_variables = l.required_variables,
    optional_variables = l.optional_variables,
    sufficient_context = l.sufficient_context,
    blocking_condition = l.blocking_condition,
    default_values = l.default_values,
    preserve_rules = l.preserve,
    avoid_rules = l.avoid,
    output_format = l.output_format,
    input_type = l.input_type::public.input_type,
    output_type = l.output_type::public.output_type,
    risk_level = l.risk_level::public.risk_level,
    max_questions = l.max_questions,
    questionnaire_mode = l.questionnaire_mode
from lot_v5_commandes l
where p.external_ref = l.ref;

-- 3. Trois variantes par commande, une par IA : sans elles, aucun payload ne
--    peut etre pose et resolve_prompt ne renvoie rien.
insert into public.prompt_variants (prompt_id, provider_id, compatibility, status, fallback_behavior)
select p.id, ia.id, 'excellent'::public.compatibility_level,
       'published'::public.content_status,
       case when l.output_type = 'image'
            then 'declare_unavailable_if_no_image_tool'::public.fallback_behavior
            else 'execute_text'::public.fallback_behavior end
from lot_v5_commandes l
join public.prompts p on p.external_ref = l.ref
cross join public.ai_providers ia
on conflict (prompt_id, provider_id) do nothing;

do $ctrl$
declare
  v_total integer;
begin
  select count(*) into v_total from public.prompts p
  join lot_v5_commandes l on l.ref = p.external_ref
  where p.level is not null;
  if v_total <> (select count(*) from lot_v5_commandes) then
    raise exception 'Lot ${numero} incomplet : % commandes sur % posees.',
      v_total, (select count(*) from lot_v5_commandes);
  end if;
end $ctrl$;

drop table lot_v5_commandes;
`;
}

// ---------------------------------------------------------------------
// Lots 2xx : les 1299 payloads
//
// Trois textes distincts par commande, un par moteur. L'ancienne version sort
// du courant sans etre supprimee : une version publiee reste tracable, et un
// retour arriere consiste a la remettre courante.
// ---------------------------------------------------------------------

function lotPayloads(numero, tranche, cumul, total) {
  return `-- Lot ${numero} : payloads ${cumul - tranche.length + 1} a ${cumul} sur ${total}.
--
-- Chaque commande recoit un texte propre a ChatGPT, a Claude et a Gemini.
-- Rien n'est supprime : l'ancienne version quitte le courant et reste lisible
-- dans l'historique, ce qui suffit a revenir en arriere.

drop table if exists lot_v5_payloads;
create temporary table lot_v5_payloads as
select * from jsonb_to_recordset(${litteralJson(tranche)}::jsonb) as x(
  ref text, moteur text, payload text, sha256 text
);

do $ctrl$
begin
  if (select count(*) from lot_v5_payloads) <> ${tranche.length} then
    raise exception 'Lot ${numero} tronque : % lignes au lieu de ${tranche.length}.',
      (select count(*) from lot_v5_payloads);
  end if;
end $ctrl$;

-- 1. L'ancien courant sort du courant.
update public.prompt_versions pv
set is_current = false, status = 'retired'::public.version_status
from lot_v5_payloads l
join public.prompts p on p.external_ref = l.ref
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers pr on pr.id = v.provider_id and pr.key = l.moteur
where pv.variant_id = v.id and pv.is_current and pv.payload is distinct from l.payload;

-- 2. Poser le nouveau texte la ou plus rien n'est courant.
insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
select v.id, '${VERSION}', l.payload, 'published'::public.version_status, true, now()
from lot_v5_payloads l
join public.prompts p on p.external_ref = l.ref
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers pr on pr.id = v.provider_id and pr.key = l.moteur
where not exists (
  select 1 from public.prompt_versions pv where pv.variant_id = v.id and pv.is_current
);

-- 3. Un texte identique deja archive redevient le courant : rejouer le lot ne
--    cree pas une version de plus.
update public.prompt_versions pv
set is_current = true, status = 'published'::public.version_status
from lot_v5_payloads l
join public.prompts p on p.external_ref = l.ref
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers pr on pr.id = v.provider_id and pr.key = l.moteur
where pv.variant_id = v.id and pv.payload = l.payload and not pv.is_current
  and not exists (select 1 from public.prompt_versions a where a.variant_id = v.id and a.is_current);

do $ctrl$
declare
  v_pose integer;
begin
  select count(*) into v_pose
  from lot_v5_payloads l
  join public.prompts p on p.external_ref = l.ref
  join public.prompt_variants v on v.prompt_id = p.id
  join public.ai_providers pr on pr.id = v.provider_id and pr.key = l.moteur
  join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
  where pv.payload = l.payload;
  if v_pose <> ${tranche.length} then
    raise exception 'Lot ${numero} : % payloads courants sur ${tranche.length}.', v_pose;
  end if;
end $ctrl$;

drop table lot_v5_payloads;
`;
}

// ---------------------------------------------------------------------
// Lot 800 : les questions
//
// Le modele V5 pose une question a la fois et reanalyse apres la reponse : il
// n'y a plus de variable a substituer ni de choix fermes. `trigger_note` porte
// la condition qui declenche la question ; la delegation (« Choisis pour
// moi ») vit dans le payload, ou elle agit.
// ---------------------------------------------------------------------

const lignesQuestions = questions.map((q) => ({
  ref: q.ref,
  sort_order: q.sort_order,
  variable: `reponse_${q.sort_order}`,
  question: q.question,
  trigger_note: q.condition,
}));

const lotQuestions = `-- Lot 800 : les ${lignesQuestions.length} questions successives.
--
-- Remplacees en bloc pour les commandes du catalogue V5 : leur ordre fait
-- partie de leur sens, et une fusion ligne a ligne laisserait des questions
-- de l'ancien questionnaire au milieu du nouveau. Les commandes hors V5
-- gardent les leurs.

drop table if exists lot_v5_questions;
create temporary table lot_v5_questions as
select * from jsonb_to_recordset(${litteralJson(lignesQuestions)}::jsonb) as d(
  ref text, sort_order smallint, variable text, question text, trigger_note text
);

-- L'effacement porte sur toutes les commandes passees en V5, pas seulement
-- sur celles qui recoivent une question ici. Quarante et une commandes V5
-- n'en posent aucune : si l'effacement suivait la liste des questions, elles
-- garderaient l'ancien questionnaire et continueraient de demander ce que le
-- classeur a justement decide de ne plus demander.
delete from public.prompt_questions q
using public.prompts p
where q.prompt_id = p.id and p.level is not null;

insert into public.prompt_questions (prompt_id, sort_order, variable, question, choices, trigger_note)
select p.id, d.sort_order, d.variable, d.question, '[]'::jsonb, d.trigger_note
from lot_v5_questions d
join public.prompts p on p.external_ref = d.ref;

do $ctrl$
declare
  v_total integer;
begin
  select count(*) into v_total
  from public.prompt_questions q
  join public.prompts p on p.id = q.prompt_id
  where p.level is not null;
  if v_total <> ${lignesQuestions.length} then
    raise exception 'Lot 800 incomplet : % questions au lieu de ${lignesQuestions.length}.', v_total;
  end if;
end $ctrl$;

drop table lot_v5_questions;
`;

// ---------------------------------------------------------------------
// Lot 810 : les alias
// ---------------------------------------------------------------------

const lignesAlias = alias.map((a) => ({
  ref: a.ref,
  canonical_ref: a.canonical_ref,
  preset: a.preset,
}));

const lotAlias = `-- Lot 810 : les ${lignesAlias.length} raccourcis devenus des modes.
--
-- La ligne du raccourci historique reste en place, avec ses visuels, ses
-- favoris et son historique de copie. L'alias dit seulement quelle commande
-- ouvrir et dans quel mode. Aucun ancien lien ne casse.
--
-- Les quinze commandes qui changent simplement de nom ne sont pas ici : elles
-- sont leur propre destination, et un alias sur soi-meme n'a pas de sens.

drop table if exists lot_v5_alias;
create temporary table lot_v5_alias as
select * from jsonb_to_recordset(${litteralJson(lignesAlias)}::jsonb) as d(
  ref text, canonical_ref text, preset jsonb
);

insert into public.prompt_aliases (alias_prompt_id, canonical_prompt_id, preset)
select a.id, canon.id, d.preset
from lot_v5_alias d
join public.prompts a on a.external_ref = d.ref
join public.prompts canon on canon.external_ref = d.canonical_ref
on conflict (alias_prompt_id) do update
  set canonical_prompt_id = excluded.canonical_prompt_id,
      preset = excluded.preset;

do $ctrl$
declare
  v_joignables integer;
  v_poses integer;
begin
  -- Le controle porte sur ce que cette base peut rattacher, pas sur un nombre
  -- fige : une base de recette ne contient pas toujours tout l'historique, et
  -- un controle qui exigerait 131 y echouerait sans qu'aucun alias soit
  -- perdu. Ce qui doit etre vrai partout : tout alias dont les deux bouts
  -- existent est enregistre.
  select count(*) into v_joignables
  from lot_v5_alias d
  join public.prompts a on a.external_ref = d.ref
  join public.prompts canon on canon.external_ref = d.canonical_ref;

  select count(*) into v_poses
  from lot_v5_alias d
  join public.prompts a on a.external_ref = d.ref
  join public.prompt_aliases pa on pa.alias_prompt_id = a.id;

  if v_poses <> v_joignables then
    raise exception 'Lot 810 incomplet : % alias enregistres sur % rattachables.',
      v_poses, v_joignables;
  end if;

  if v_joignables < ${lignesAlias.length} then
    raise notice 'Lot 810 : % alias sur ${lignesAlias.length} — % raccourcis historiques absents de cette base.',
      v_joignables, ${lignesAlias.length} - v_joignables;
  end if;
end $ctrl$;

drop table lot_v5_alias;
`;

// ---------------------------------------------------------------------
// Ecriture
// ---------------------------------------------------------------------

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const fichiers = [];
const ecrire = (nom, contenu) => {
  writeFileSync(join(OUT, nom), contenu, 'utf8');
  fichiers.push(nom);
};

ecrire('001_familles.sql', lotFamilles);

const TAILLE_COMMANDES = 25;
let cumul = 0;
for (let i = 0; i * TAILLE_COMMANDES < lignesCommandes.length; i += 1) {
  const tranche = lignesCommandes.slice(i * TAILLE_COMMANDES, (i + 1) * TAILLE_COMMANDES);
  cumul += tranche.length;
  const numero = String(100 + i + 1);
  ecrire(
    `${numero}_commandes_${String(i + 1).padStart(2, '0')}.sql`,
    lotCommandes(numero, tranche, cumul, lignesCommandes.length),
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
ecrire('810_alias.sql', lotAlias);

console.log(`${fichiers.length} lots ecrits dans supabase/seed/v5/`);
