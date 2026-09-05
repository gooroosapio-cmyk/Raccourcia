-- =====================================================================
-- RaccourcIA - 08. Resolution du payload premium
--
-- Le navigateur ne recoit jamais tout le catalogue premium : il recoit un
-- seul payload, a la demande, apres controle complet (Doc Technique, 10.2).
--
-- La fonction est SECURITY DEFINER : elle seule franchit la RLS de
-- prompt_versions, et uniquement apres avoir verifie, dans cet ordre :
--   1. session Supabase valide
--   2. app_session active
--   3. entitlement actif (sauf raccourci gratuit)
--   4. prompt publie et categorie visible
--   5. variante du provider publiee
--   6. version courante publiee
-- Aucun appel a service_role n'est necessaire sur ce chemin.
-- =====================================================================

create or replace function public.resolve_prompt(
  p_prompt_id uuid,
  p_provider_key text,
  p_surface text default 'detail'
)
returns table (
  command text,
  payload text,
  version_id uuid,
  version_label text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_prompt public.prompts%rowtype;
  v_variant_id uuid;
  v_version public.prompt_versions%rowtype;
begin
  -- 1. Session Supabase valide.
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  -- 2. Session applicative active (limite souple d'appareils).
  if not public.current_app_session_is_active() then
    raise exception 'SESSION_INACTIVE' using errcode = '28000';
  end if;

  -- 4. Prompt publie dans une categorie visible.
  select * into v_prompt
  from public.prompts p
  where p.id = p_prompt_id
    and p.status = 'published'
    and exists (
      select 1 from public.categories c where c.id = p.category_id and c.is_visible
    );

  -- Un 403 ne doit pas reveler si une version premium existe en interne :
  -- prompt absent et prompt non autorise renvoient la meme erreur.
  if not found then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  -- 3. Entitlement actif, sauf pour les raccourcis gratuits de demonstration.
  if not v_prompt.is_free and not public.has_active_entitlement(v_user_id) then
    raise exception 'ACCESS_REQUIRED' using errcode = '42501';
  end if;

  -- 5. Variante publiee pour l'IA demandee.
  select v.id into v_variant_id
  from public.prompt_variants v
  join public.ai_providers pr on pr.id = v.provider_id
  where v.prompt_id = v_prompt.id
    and pr.key = p_provider_key
    and pr.is_active
    and v.status = 'published';

  if v_variant_id is null then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  -- 6. Version courante publiee.
  select * into v_version
  from public.prompt_versions pv
  where pv.variant_id = v_variant_id
    and pv.is_current
    and pv.status = 'published';

  if not found then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  -- Journalisation d'usage : jamais le payload, seulement l'action de copie.
  insert into public.copy_events (
    user_id, prompt_id, variant_id, version_id, provider_key, surface
  )
  values (v_user_id, v_prompt.id, v_variant_id, v_version.id, p_provider_key, p_surface);

  insert into public.recent_items (user_id, prompt_id, last_copied_at, copy_count)
  values (v_user_id, v_prompt.id, now(), 1)
  on conflict (user_id, prompt_id) do update
    set last_copied_at = now(),
        copy_count = public.recent_items.copy_count + 1;

  return query
    select v_prompt.command::text, v_version.payload, v_version.id, v_version.version_label;
end;
$$;

revoke all on function public.resolve_prompt(uuid, text, text) from public, anon;
grant execute on function public.resolve_prompt(uuid, text, text) to authenticated;

-- Enregistre une consultation (alimente la vue Recents, sans payload).
create or replace function public.track_prompt_view(p_prompt_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    return;
  end if;

  insert into public.recent_items (user_id, prompt_id, last_viewed_at)
  values (v_user_id, p_prompt_id, now())
  on conflict (user_id, prompt_id) do update set last_viewed_at = now();
end;
$$;

revoke all on function public.track_prompt_view(uuid) from public, anon;
grant execute on function public.track_prompt_view(uuid) to authenticated;

-- Enregistre ou rafraichit la session applicative de l'appareil courant.
-- Retourne le nombre de sessions actives afin que l'interface propose de
-- deconnecter un appareil au-dela de la limite, plutot que de bloquer.
create or replace function public.register_app_session(p_device_label text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session_id uuid := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;
  v_active integer;
begin
  if v_user_id is null or v_session_id is null then
    return 0;
  end if;

  insert into public.app_sessions (user_id, auth_session_id, device_label)
  values (v_user_id, v_session_id, p_device_label)
  on conflict (auth_session_id) do update
    set last_seen_at = now(),
        status = 'active',
        device_label = coalesce(excluded.device_label, public.app_sessions.device_label);

  select count(*) into v_active
  from public.app_sessions
  where user_id = v_user_id and status = 'active';

  return v_active;
end;
$$;

revoke all on function public.register_app_session(text) from public, anon;
grant execute on function public.register_app_session(text) to authenticated;
