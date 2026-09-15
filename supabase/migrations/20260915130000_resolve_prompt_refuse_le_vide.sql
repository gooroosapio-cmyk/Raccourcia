-- =====================================================================
-- resolve_prompt : un texte vide ne se copie pas.
--
-- Le catalogue V2 arrive sans payload : une carte existe avant son texte.
-- Jusqu'ici, une version courante vide aurait ete servie telle quelle, et
-- le membre aurait colle une chaine vide dans son IA sans comprendre.
--
-- Un seul controle change, le sixieme : la version doit porter quelque
-- chose. Les cinq autres restent dans le meme ordre, et un refus dit
-- toujours la meme chose, que la commande soit absente, non publiee, non
-- autorisee ou sans texte — un 403 ne renseigne jamais sur l'interieur.
--
-- Le catalogue V2 ne distingue plus les moteurs : ses commandes portent le
-- meme texte sur leurs trois variantes. C'est une decision d'ecriture, pas
-- de schema — la fonction n'a donc pas a la connaitre.
--
-- `resolve_free_prompt` appelle celle-ci et n'a pas a etre reecrite.
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

  -- 6. Version courante publiee, et qui porte quelque chose.
  --
  -- Le catalogue V2 arrive sans texte : une carte existe avant son payload.
  -- Copier une chaine vide ne rendrait pas service — on refuse comme pour
  -- une commande indisponible, et l'ecran le dit avant d'en arriver la.
  select * into v_version
  from public.prompt_versions pv
  where pv.variant_id = v_variant_id
    and pv.is_current
    and pv.status = 'published';

  if not found or coalesce(btrim(v_version.payload), '') = '' then
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

revoke all on function public.resolve_prompt(uuid, text, text) from public;
grant execute on function public.resolve_prompt(uuid, text, text) to authenticated;
