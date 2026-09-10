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
// Lot 000 : sauvegarde de ce que l'import va reecrire
//
// Les payloads ne sont jamais perdus : l'ancienne version quitte le courant
// et reste lisible. Les colonnes editoriales, elles, sont reecrites sur
// place et n'ont aucune histoire — sans cette copie, revenir en arriere sur
// le texte de 433 commandes serait impossible.
//
// `create table if not exists ... as` : la premiere execution capture l'etat
// d'avant, les suivantes ne touchent a rien. Rejouer l'import n'ecrase donc
// jamais la sauvegarde par l'etat deja importe.
// ---------------------------------------------------------------------

const lotSauvegarde = `-- Lot 000 : copie des colonnes que l'import va reecrire.
--
-- A conserver jusqu'a la recette moteur. Ensuite, ces deux tables peuvent
-- disparaitre sans rien emporter :
--   drop table if exists public.prompts_avant_v5;
--   drop table if exists public.prompt_questions_avant_v5;

create table if not exists public.prompts_avant_v5 as
select
  p.id, p.external_ref, p.command::text as command, p.slug, p.name,
  p.short_description, p.intention, p.use_cases,
  p.required_variables, p.optional_variables, p.sufficient_context,
  p.blocking_condition, p.default_values, p.preserve_rules, p.avoid_rules,
  p.output_format, p.input_type::text as input_type,
  p.output_type::text as output_type, p.risk_level::text as risk_level,
  p.max_questions, p.questionnaire_mode,
  now() as sauvegarde_le
from public.prompts p;

comment on table public.prompts_avant_v5 is
  'Colonnes editoriales des raccourcis avant l''import V5. Sert au retour arriere ; aucun media, aucun statut, aucun palier.';

create table if not exists public.prompt_questions_avant_v5 as
select q.*, now() as sauvegarde_le from public.prompt_questions q;

comment on table public.prompt_questions_avant_v5 is
  'Questionnaire avant l''import V5. L''import remplace en bloc les questions des commandes V5.';

-- Ces tables ne regardent que l'exploitation. Le declencheur de la base
-- active deja la RLS sur toute table creee ; on retire en plus tout droit
-- residuel, pour qu'aucun role client ne puisse meme les interroger.
revoke all on table public.prompts_avant_v5 from anon, authenticated;
revoke all on table public.prompt_questions_avant_v5 from anon, authenticated;

do $ctrl$
declare
  v_lignes integer;
begin
  select count(*) into v_lignes from public.prompts_avant_v5;
  if v_lignes = 0 then
    raise exception 'Sauvegarde vide : import interrompu.';
  end if;
  raise notice 'Sauvegarde : % raccourcis conserves avant reecriture.', v_lignes;
end $ctrl$;
`;

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
  aliases: c.aliases,
}));

const CHAMPS_COMMANDE = `ref text, command text, slug text, family_id text, title text,
  short_description text, main_use_case text, level text, preset_key text,
  required_variables text[], optional_variables text[], sufficient_context text,
  blocking_condition text, default_values text, preserve text, avoid text,
  output_format text, risk_level text, mode text, input_type text, output_type text,
  max_questions smallint, questionnaire_mode text, aliases text[]`;

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
  intention, aliases,
  level, preset_key, required_variables, optional_variables, sufficient_context,
  blocking_condition, default_values, preserve_rules, avoid_rules, output_format,
  input_type, output_type, risk_level, show_image_card, catalog_version, status,
  max_questions, questionnaire_mode
)
select
  l.ref, l.command::extensions.citext, l.slug, l.title, l.mode::public.app_mode, c.id,
  l.short_description, array[l.main_use_case], l.main_use_case, l.aliases,
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
--
--    Les cas d'usage non plus : le classeur V5 ne donne qu'une phrase de
--    situation, qui tient bien dans l'intention mais ferait un mauvais
--    libelle sur une carte. Les cas d'usage courts deja en place restent.
update public.prompts p
set command = l.command::extensions.citext,
    name = l.title,
    short_description = l.short_description,
    -- La mission du classeur devient l'intention : c'est elle que la fiche
    -- d'une commande texte affiche a la place du visuel, et c'est par elle
    -- qu'une recherche par besoin retrouve la commande.
    intention = l.main_use_case,
    -- Les noms auxquels la commande repond : anciens noms, raccourcis
    -- devenus des modes, modes. Sans eux, quelqu'un qui a garde /emailpro
    -- en tete ne trouve plus rien.
    aliases = l.aliases,
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
// La bascule de taxonomie
//
// Elle vit hors du dossier genere : celui-ci est efface et reecrit a chaque
// passage, et une bascule est une decision d'exploitation qu'on applique une
// fois, quand on l'a decidee. Elle est tout de meme produite ici pour que le
// rangement des 433 commandes ne puisse pas deriver du classeur.
//
// Tout tient dans une transaction : une bascule a moitie faite est un
// catalogue casse.
// ---------------------------------------------------------------------

const rangement = lire('rangement');

const bascule = `-- =====================================================================
-- Bascule de taxonomie V5
--
-- A appliquer apres les lots de \`supabase/seed/v5/\`, jamais avant. C'est
-- la seule etape que les membres verront : les quatorze familles V5
-- s'ouvrent, les 429 commandes canoniques publiees les rejoignent, les
-- raccourcis qu'elles ont absorbes quittent le catalogue, et l'ancienne
-- taxonomie est archivee.
--
-- Rien n'est supprime. Un raccourci absorbe garde sa ligne, ses visuels,
-- son historique et son identifiant : une adresse deja partagee continue de
-- repondre, \`resoudre_alias\` la conduisant vers la commande qui fait
-- desormais le travail.
--
-- RETOUR ARRIERE — la sauvegarde posee en tete rend l'etat exact :
--   update public.prompts p
--     set category_id = s.category_id,
--         status = s.status::public.content_status,
--         is_free = s.is_free
--     from public.prompts_avant_bascule_v5 s where s.id = p.id;
--   update public.categories set status = 'published'::public.content_status
--    where external_ref is not null and external_ref not like '%-V5-%';
--   update public.categories set status = 'draft'::public.content_status
--    where external_ref like '%-V5-%';
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Sauvegarde de ce que la bascule deplace
-- ---------------------------------------------------------------------

create table if not exists public.prompts_avant_bascule_v5 as
select id, external_ref, command::text as command, category_id,
       status::text as status, is_free, now() as sauvegarde_le
from public.prompts;

revoke all on table public.prompts_avant_bascule_v5 from anon, authenticated;

comment on table public.prompts_avant_bascule_v5 is
  'Rangement, statut et palier des raccourcis avant la bascule V5. Sert au retour arriere.';

-- ---------------------------------------------------------------------
-- Refus de basculer sur un catalogue partiel
--
-- La production a deja affiche des puces vides une fois, heritees d'un
-- import laisse a moitie. Si le compte n'y est pas, rien ne bouge.
-- ---------------------------------------------------------------------

do $ctrl$
declare
  v_canoniques integer;
  v_payloads integer;
  v_alias integer;
  v_familles integer;
  v_orphelins integer;
  v_noms text;
  v_vides integer;
begin
  select count(*) into v_canoniques from public.prompts where level is not null;
  if v_canoniques <> ${lignesCommandes.length} then
    raise exception 'Bascule refusee : % commandes V5 au lieu de ${lignesCommandes.length}. L''import n''est pas passe.', v_canoniques;
  end if;

  select count(*) into v_payloads
  from public.prompt_versions pv
  join public.prompt_variants v on v.id = pv.variant_id
  join public.prompts p on p.id = v.prompt_id and p.level is not null
  where pv.is_current and pv.version_label = '${VERSION}';
  if v_payloads <> ${payloads.length} then
    raise exception 'Bascule refusee : % payloads V5 courants au lieu de ${payloads.length}.', v_payloads;
  end if;

  -- Pas un compte absolu : une base de recette ne contient pas toujours
  -- tout l'historique, et les alias dont le raccourci d'origine manque n'y
  -- sont pas crees. Ce qui doit etre vrai partout, c'est qu'ils existent —
  -- le controle des orphelins ci-dessous se charge du reste, et il est
  -- autrement plus protecteur qu'un nombre.
  select count(*) into v_alias from public.prompt_aliases;
  if v_alias = 0 then
    raise exception 'Bascule refusee : aucun alias enregistre. Le lot 810 n''est pas passe.';
  end if;

  select count(*) into v_familles from public.categories where external_ref like '%-V5-%';
  if v_familles <> ${familles.length} then
    raise exception 'Bascule refusee : % familles V5 au lieu de ${familles.length}.', v_familles;
  end if;

  -- Le controle qui compte le plus. Une commande publiee dans une famille
  -- que cette bascule va archiver, et qui ne serait ni canonique ni
  -- absorbee, n'a nulle part ou aller : elle disparaitrait de l'ecran sans
  -- que rien ne la remplace et sans qu'aucune adresse ne la rattrape.
  --
  -- Borne aux familles que la bascule ferme : une commande rangee ailleurs
  -- garde sa famille et n'est concernee par rien de tout ceci.
  --
  -- Le message nomme les coupables. Un refus qui donne un nombre laisse
  -- l'operateur chercher; un refus qui donne des noms se traite.
  select count(*), string_agg(p.command::text, ', ' order by p.command::text)
    into v_orphelins, v_noms
  from public.prompts p
  join public.categories c on c.id = p.category_id and c.is_visible
  where p.status = 'published'
    and c.external_ref is not null
    and c.external_ref not like '%-V5-%'
    and p.level is null
    and not exists (select 1 from public.prompt_aliases a where a.alias_prompt_id = p.id);
  if v_orphelins > 0 then
    raise exception 'Bascule refusee : % raccourcis publies ne sont ni canoniques ni absorbes (%). Les archiver ou leur donner une destination avant de basculer.',
      v_orphelins, v_noms;
  end if;

  -- Une famille ouverte sans commande est un cul-de-sac.
  select count(*) into v_vides
  from public.categories f
  where f.external_ref like '%-V5-%'
    and not exists (
      select 1
      from jsonb_to_recordset(${litteralJson(rangement)}::jsonb) as d(ref text, family_id text)
      join public.prompts p on p.external_ref = d.ref
      where d.family_id = f.external_ref and p.status = 'published'
    );
  if v_vides > 0 then
    raise exception 'Bascule refusee : % familles V5 n''accueilleraient aucune commande.', v_vides;
  end if;
end $ctrl$;

-- ---------------------------------------------------------------------
-- Le palier offert suit la commande qui fait le travail
--
-- Trois raccourcis offerts sont absorbes. Sans ce transfert, un visiteur
-- qui pouvait copier /eventposter perdrait cette possibilite alors que le
-- meme travail se fait toujours, sous le nom de la commande canonique.
-- Le palier est un arbitrage commercial : il se corrige d'un clic depuis
-- l'administration si cette generosite n'est pas voulue.
-- ---------------------------------------------------------------------

update public.prompts canon
set is_free = true
from public.prompt_aliases a
join public.prompts ancien on ancien.id = a.alias_prompt_id
where canon.id = a.canonical_prompt_id
  and ancien.is_free
  and ancien.status = 'published'
  and not canon.is_free;

-- ---------------------------------------------------------------------
-- Les quatorze familles s'ouvrent
--
-- \`is_visible\` est derivee du statut par declencheur : publier suffit.
-- Elles s'ouvrent avant que les commandes n'arrivent, et tout tient dans la
-- meme transaction : personne ne voit ni rayon vide ni commande orpheline.
-- ---------------------------------------------------------------------

update public.categories
set status = 'published'::public.content_status
where external_ref like '%-V5-%';

-- ---------------------------------------------------------------------
-- Chaque commande canonique rejoint sa famille
-- ---------------------------------------------------------------------

update public.prompts p
set category_id = f.id
from jsonb_to_recordset(${litteralJson(rangement)}::jsonb) as d(ref text, family_id text)
join public.categories f on f.external_ref = d.family_id
where p.external_ref = d.ref and p.category_id is distinct from f.id;

-- ---------------------------------------------------------------------
-- Les raccourcis absorbes quittent le catalogue
--
-- Archives, jamais supprimes : la ligne garde ses visuels, ses favoris et
-- son historique de copie, et \`resoudre_alias\` conduit son ancienne
-- adresse vers la commande canonique. C'est ce que le classeur demande —
-- creer l'alias avant toute desactivation de carte.
--
-- A une condition : que la commande canonique soit publiee. Le cas n'est
-- pas theorique — /dialogue est absorbe par /story, que l'administration a
-- archive. Retirer /dialogue rendrait son adresse muette et ferait
-- disparaitre un outil sans rien mettre a la place. Il reste donc en ligne,
-- et sa famille avec lui. Publiez la commande canonique, rejouez la
-- bascule, et il partira de lui-meme.
-- ---------------------------------------------------------------------

update public.prompts
set status = 'archived'::public.content_status
where status = 'published'
  and id in (
    select a.alias_prompt_id
    from public.prompt_aliases a
    join public.prompts canon on canon.id = a.canonical_prompt_id
    where canon.status = 'published'
  );

-- ---------------------------------------------------------------------
-- L'ancienne taxonomie est archivee
--
-- Seulement si elle est vide : archiver une famille encore peuplee rendrait
-- ses commandes introuvables. Mieux vaut la laisser et le voir.
-- ---------------------------------------------------------------------

update public.categories c
set status = 'archived'::public.content_status
where c.external_ref is not null
  and c.external_ref not like '%-V5-%'
  and not exists (
    select 1 from public.prompts p
    where p.category_id = c.id and p.status = 'published'
  );

-- ---------------------------------------------------------------------
-- Controles de sortie
-- ---------------------------------------------------------------------

do $ctrl$
declare
  v_hors_ecran integer;
  v_vides integer;
  v_offertes integer;
  v_offertes_avant integer;
  v_adresses integer;
  v_gardes integer;
  v_noms_gardes text;
  v_publiees integer;
begin
  select count(*) into v_hors_ecran
  from public.prompts p
  where p.status = 'published'
    and (p.category_id is null
         or not exists (select 1 from public.categories c
                        where c.id = p.category_id and c.is_visible));
  if v_hors_ecran > 0 then
    raise exception '% commandes publiees hors des familles visibles.', v_hors_ecran;
  end if;

  select count(*) into v_vides
  from public.categories c
  where c.is_visible
    and not exists (select 1 from public.prompts p
                    where p.category_id = c.id and p.status = 'published');
  if v_vides > 0 then
    raise exception '% familles visibles sans aucune commande.', v_vides;
  end if;

  -- Le palier d'essai est la porte d'entree du produit : il ne doit pas
  -- avoir retreci en chemin.
  select count(*) into v_offertes
  from public.prompts p
  join public.categories c on c.id = p.category_id and c.is_visible
  where p.status = 'published' and p.is_free;
  select count(*) into v_offertes_avant
  from public.prompts_avant_bascule_v5 s
  where s.status = 'published' and s.is_free;
  if v_offertes < 1 then
    raise exception 'Plus aucune commande offerte n''est visible.';
  end if;

  -- Chaque adresse effectivement retiree du catalogue doit conduire
  -- quelque part. Celles qui restent en ligne n'ont besoin de personne.
  select count(*) into v_adresses
  from public.prompt_aliases a
  join public.prompts ancien on ancien.id = a.alias_prompt_id
  where ancien.status = 'archived'
    and not exists (select 1 from public.resoudre_alias(ancien.slug));
  if v_adresses > 0 then
    raise exception '% anciennes adresses retirees ne menent nulle part.', v_adresses;
  end if;

  -- Ceux qu'on a gardes se signalent : c'est une situation a regler, pas un
  -- etat d'equilibre.
  select count(*), string_agg(ancien.command::text || ' (attend ' || canon.command::text || ')', ', ')
    into v_gardes, v_noms_gardes
  from public.prompt_aliases a
  join public.prompts ancien on ancien.id = a.alias_prompt_id and ancien.status = 'published'
  join public.prompts canon on canon.id = a.canonical_prompt_id;
  if v_gardes > 0 then
    raise notice '% raccourcis absorbes restent en ligne, leur commande canonique n''etant pas publiee : %.',
      v_gardes, v_noms_gardes;
  end if;

  select count(*) into v_publiees
  from public.prompts p
  join public.categories c on c.id = p.category_id and c.is_visible
  where p.status = 'published';

  raise notice 'Bascule effectuee : % commandes visibles dans quatorze familles, % offertes (% avant).',
    v_publiees, v_offertes, v_offertes_avant;
end $ctrl$;

commit;
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

ecrire('000_sauvegarde.sql', lotSauvegarde);
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

writeFileSync(join(ROOT, 'supabase', 'seed', 'bascule-taxonomie-v5.sql'), bascule, 'utf8');

console.log(`${fichiers.length} lots ecrits dans supabase/seed/v5/`);
console.log('bascule ecrite dans supabase/seed/bascule-taxonomie-v5.sql');
