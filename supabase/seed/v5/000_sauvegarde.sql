-- Lot 000 : copie des colonnes que l'import va reecrire.
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
