-- =====================================================================
-- RaccourcIA - 13. Analytics d'usage (lot 8)
--
-- Toutes les agregations vivent ici, pas dans l'interface : compter des
-- copies en JavaScript imposerait de rapatrier copy_events ligne a ligne,
-- ce qui ne tient pas a l'echelle et exposerait qui a copie quoi.
--
-- Ces fonctions ne renvoient que des agregats. Aucune ne permet de savoir
-- quel membre a copie quel raccourci : le produit mesure son catalogue,
-- pas ses utilisateurs (Doc Technique V1, 18).
-- =====================================================================

-- Fenetre d'observation bornee : une valeur aberrante ne doit pas se
-- traduire par un balayage complet de la table.
create or replace function public.analytics_window(p_days integer)
returns integer
language sql
immutable
as $$
  select least(greatest(coalesce(p_days, 30), 1), 365);
$$;

revoke all on function public.analytics_window(integer) from public, anon, authenticated;

/**
 * Chiffres de tete du tableau analytics.
 *
 * `purchases_unclaimed` est le seul chiffre reellement alarmant : un achat
 * encaisse dont le compte n'a jamais ete active, donc un client qui a paye
 * et n'a rien recu.
 */
create or replace function public.admin_analytics_overview(p_days integer default 30)
returns table (
  copies_period bigint,
  copies_total bigint,
  active_members bigint,
  members_with_access bigint,
  purchases_completed bigint,
  purchases_unclaimed bigint,
  prompts_published bigint,
  prompts_copied bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_since timestamptz;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_since := now() - make_interval(days => public.analytics_window(p_days));

  return query
    select
      (select count(*) from public.copy_events where created_at >= v_since),
      (select count(*) from public.copy_events),
      (select count(distinct user_id) from public.copy_events
        where created_at >= v_since and user_id is not null),
      (select count(*) from public.entitlements where status = 'active'),
      (select count(*) from public.purchases where status = 'completed'),
      (select count(*) from public.purchases where status = 'completed' and user_id is null),
      (select count(*) from public.prompts where status = 'published'),
      (select count(distinct prompt_id) from public.copy_events where created_at >= v_since);
end;
$$;

revoke all on function public.admin_analytics_overview(integer) from public, anon;
grant execute on function public.admin_analytics_overview(integer) to authenticated;

/**
 * Copies par jour, zeros compris.
 *
 * La serie est generee puis jointe : un jour sans copie doit apparaitre a
 * zero, sinon la courbe ment par omission.
 */
create or replace function public.admin_analytics_daily(p_days integer default 30)
returns table (day date, copies bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_days integer;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_days := public.analytics_window(p_days);

  return query
    select d.day::date, count(c.id)
    from generate_series(
      (current_date - (v_days - 1)),
      current_date,
      interval '1 day'
    ) as d(day)
    left join public.copy_events c
      on date_trunc('day', c.created_at) = d.day
    group by d.day
    order by d.day;
end;
$$;

revoke all on function public.admin_analytics_daily(integer) from public, anon;
grant execute on function public.admin_analytics_daily(integer) to authenticated;

/**
 * Repartition des copies par mode, par IA et par surface d'origine.
 *
 * Format long (dimension, cle, libelle) : une seule fonction couvre les
 * trois axes, et en ajouter un quatrieme ne demande pas un nouvel appel.
 * Le libelle n'est renseigne que lorsqu'il vient des donnees (nom d'IA) :
 * les libelles de mode et de surface appartiennent a lib/constants.ts.
 */
create or replace function public.admin_analytics_breakdown(p_days integer default 30)
returns table (dimension text, key text, label text, copies bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_since timestamptz;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_since := now() - make_interval(days => public.analytics_window(p_days));

  return query
    select 'mode'::text, p.mode::text, null::text, count(*)
    from public.copy_events c
    join public.prompts p on p.id = c.prompt_id
    where c.created_at >= v_since
    group by p.mode

    union all

    select 'ia'::text, c.provider_key, max(a.name), count(*)
    from public.copy_events c
    left join public.ai_providers a on a.key = c.provider_key
    where c.created_at >= v_since and c.provider_key is not null
    group by c.provider_key

    union all

    select 'surface'::text, c.surface, null::text, count(*)
    from public.copy_events c
    where c.created_at >= v_since and c.surface is not null
    group by c.surface

    order by 1, 4 desc;
end;
$$;

revoke all on function public.admin_analytics_breakdown(integer) from public, anon;
grant execute on function public.admin_analytics_breakdown(integer) to authenticated;

/** Raccourcis les plus copies sur la periode. */
create or replace function public.admin_analytics_top_prompts(
  p_days integer default 30,
  p_limit integer default 10
)
returns table (
  prompt_id uuid,
  command text,
  name text,
  mode public.app_mode,
  copies bigint,
  members bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_since timestamptz;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_since := now() - make_interval(days => public.analytics_window(p_days));

  return query
    select p.id, p.command::text, p.name, p.mode,
           count(*), count(distinct c.user_id)
    from public.copy_events c
    join public.prompts p on p.id = c.prompt_id
    where c.created_at >= v_since
    group by p.id, p.command, p.name, p.mode
    order by count(*) desc, p.name
    limit least(greatest(coalesce(p_limit, 10), 1), 50);
end;
$$;

revoke all on function public.admin_analytics_top_prompts(integer, integer) from public, anon;
grant execute on function public.admin_analytics_top_prompts(integer, integer) to authenticated;

/**
 * Raccourcis publies que personne n'a copies sur la periode.
 *
 * C'est la liste qui appelle une decision : reecrire, mieux classer, ou
 * archiver. Un raccourci publie mais jamais copie est du bruit dans la
 * bibliotheque.
 */
create or replace function public.admin_analytics_unused_prompts(
  p_days integer default 30,
  p_limit integer default 10
)
returns table (
  prompt_id uuid,
  command text,
  name text,
  mode public.app_mode,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_since timestamptz;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_since := now() - make_interval(days => public.analytics_window(p_days));

  return query
    select p.id, p.command::text, p.name, p.mode, p.published_at
    from public.prompts p
    where p.status = 'published'
      and not exists (
        select 1 from public.copy_events c
        where c.prompt_id = p.id and c.created_at >= v_since
      )
    order by p.published_at nulls last, p.name
    limit least(greatest(coalesce(p_limit, 10), 1), 50);
end;
$$;

revoke all on function public.admin_analytics_unused_prompts(integer, integer) from public, anon;
grant execute on function public.admin_analytics_unused_prompts(integer, integer) to authenticated;
