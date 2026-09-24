-- =====================================================================
-- La copie en deux temps : lire, puis enregistrer apres succes
--
-- `resolve_prompt` journalisait la copie au moment ou il rendait le texte,
-- donc AVANT que le navigateur ait ecrit dans le presse-papiers. Un refus
-- du presse-papiers — Safari hors du geste, un onglet en arriere-plan —
-- laissait une copie comptee qui n'avait pas eu lieu, et un double toucher
-- en comptait deux. Le rapport de refonte UI (23 septembre 2026) exige
-- l'inverse : l'historique ne s'incremente qu'apres une copie reussie, et
-- les clics rapides ne creent pas de doublon.
--
-- DEUX FONCTIONS, DEUX DROITS.
--   * `lire_prompt` / `lire_prompt_offert` : memes controles, dans le meme
--     ordre, que `resolve_prompt` / `resolve_free_prompt`, sans rien ecrire.
--   * `enregistrer_copie` : appelee par le navigateur une fois le
--     presse-papiers ecrit. Elle refait les controles d'acces — un compteur
--     que n'importe qui peut gonfler ne mesure plus rien — et ignore une
--     seconde copie de la meme commande par le meme membre dans les dix
--     secondes.
--
-- L'IA N'EST PLUS UN CRITERE. `variante_servie` gagne un dernier repli :
-- sans variante universelle ni variante pour l'IA demandee, elle sert la
-- premiere variante publiee d'une IA active. Une IA absente ou inconnue ne
-- peut donc plus provoquer un refus (CLAUDE.md, « Un seul payload »).
--
-- `resolve_prompt` et `resolve_free_prompt` restent en place, inchanges :
-- la version en ligne les appelle jusqu'au deploiement, et le retour
-- arriere n'a qu'a redeployer l'ancien code.
-- =====================================================================

create or replace function public.variante_servie(p_prompt_id uuid, p_provider_key text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select v.id
       from public.prompt_variants v
       join public.ai_providers a on a.id = v.provider_id
      where v.prompt_id = p_prompt_id
        and a.key = 'universel'
        and v.status = 'published'),
    (select v.id
       from public.prompt_variants v
       join public.ai_providers a on a.id = v.provider_id
      where v.prompt_id = p_prompt_id
        and a.key = p_provider_key
        and a.is_active
        and v.status = 'published'),
    (select v.id
       from public.prompt_variants v
       join public.ai_providers a on a.id = v.provider_id
      where v.prompt_id = p_prompt_id
        and a.is_active
        and v.status = 'published'
      order by a.sort_order, a.key
      limit 1)
  )
$$;

revoke all on function public.variante_servie(uuid, text) from public;

-- --- Lire, pour un compte connecte -----------------------------------------
create or replace function public.lire_prompt(
  p_prompt_id uuid,
  p_provider_key text default null
)
returns table (command text, payload text, version_id uuid, version_label text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_prompt public.prompts%rowtype;
  v_variant_id uuid;
  v_version public.prompt_versions%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if not public.current_app_session_is_active() then
    raise exception 'SESSION_INACTIVE' using errcode = '28000';
  end if;

  select * into v_prompt
  from public.prompts p
  where p.id = p_prompt_id
    and p.status = 'published'
    and exists (select 1 from public.categories c where c.id = p.category_id and c.is_visible);

  -- Absent, non publie ou non autorise : un seul refus, qui ne dit rien
  -- de ce qui existe en interne.
  if not found then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  if not v_prompt.is_free and not public.has_active_entitlement(v_user_id) then
    raise exception 'ACCESS_REQUIRED' using errcode = '42501';
  end if;

  v_variant_id := public.variante_servie(v_prompt.id, p_provider_key);

  select * into v_version
  from public.prompt_versions pv
  where pv.variant_id = v_variant_id and pv.is_current and pv.status = 'published';

  if not found or coalesce(btrim(v_version.payload), '') = '' then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  return query
    select v_prompt.command::text, v_version.payload, v_version.id, v_version.version_label;
end;
$$;

revoke all on function public.lire_prompt(uuid, text) from public;
grant execute on function public.lire_prompt(uuid, text) to authenticated;

-- --- Lire, pour un visiteur : les commandes offertes seulement -------------
create or replace function public.lire_prompt_offert(
  p_prompt_id uuid,
  p_provider_key text default null
)
returns table (command text, payload text, version_id uuid, version_label text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_prompt public.prompts%rowtype;
  v_variant_id uuid;
  v_version public.prompt_versions%rowtype;
begin
  select * into v_prompt
  from public.prompts p
  where p.id = p_prompt_id
    and p.is_free
    and p.status = 'published'
    and exists (select 1 from public.categories c where c.id = p.category_id and c.is_visible);

  if not found then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  v_variant_id := public.variante_servie(v_prompt.id, p_provider_key);

  select * into v_version
  from public.prompt_versions pv
  where pv.variant_id = v_variant_id and pv.is_current and pv.status = 'published';

  if not found or coalesce(btrim(v_version.payload), '') = '' then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  return query
    select v_prompt.command::text, v_version.payload, v_version.id, v_version.version_label;
end;
$$;

revoke all on function public.lire_prompt_offert(uuid, text) from public;
grant execute on function public.lire_prompt_offert(uuid, text) to anon, authenticated;

-- --- Enregistrer, une fois le presse-papiers ecrit -------------------------
-- Rend vrai si la copie est inscrite, faux si c'etait un doublon. Les
-- refus d'acces levent, comme a la lecture : une copie qu'on n'aurait pas
-- pu lire ne s'enregistre pas.
create or replace function public.enregistrer_copie(
  p_prompt_id uuid,
  p_version_id uuid,
  p_provider_key text default null,
  p_surface text default 'detail'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_prompt public.prompts%rowtype;
  v_variant_id uuid;
begin
  if v_user_id is not null and not public.current_app_session_is_active() then
    raise exception 'SESSION_INACTIVE' using errcode = '28000';
  end if;

  select * into v_prompt
  from public.prompts p
  where p.id = p_prompt_id
    and p.status = 'published'
    and exists (select 1 from public.categories c where c.id = p.category_id and c.is_visible);

  if not found then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  if not v_prompt.is_free
     and (v_user_id is null or not public.has_active_entitlement(v_user_id)) then
    raise exception 'ACCESS_REQUIRED' using errcode = '42501';
  end if;

  -- La version annoncee doit etre une version de cette commande. Sans ce
  -- controle, le journal pourrait attribuer une copie a une autre carte.
  select pv.variant_id into v_variant_id
  from public.prompt_versions pv
  join public.prompt_variants v on v.id = pv.variant_id
  where pv.id = p_version_id and v.prompt_id = v_prompt.id;

  if v_variant_id is null then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  -- Un double toucher, ou un second clic avant la confirmation, n'est pas
  -- une seconde copie. Un visiteur n'a pas d'identite a comparer : son
  -- bouton ne part pas deux fois, et le quota de la route borne le reste.
  if v_user_id is not null and exists (
    select 1 from public.copy_events e
    where e.user_id = v_user_id
      and e.prompt_id = v_prompt.id
      and e.created_at > now() - interval '10 seconds'
  ) then
    return false;
  end if;

  -- Jamais le texte copie ni les champs saisis : seulement le geste.
  insert into public.copy_events (user_id, prompt_id, variant_id, version_id, provider_key, surface)
  values (v_user_id, v_prompt.id, v_variant_id, p_version_id, p_provider_key, left(p_surface, 40));

  if v_user_id is not null then
    insert into public.recent_items (user_id, prompt_id, last_copied_at, copy_count)
    values (v_user_id, v_prompt.id, now(), 1)
    on conflict (user_id, prompt_id) do update
      set last_copied_at = now(),
          copy_count = public.recent_items.copy_count + 1;
  end if;

  return true;
end;
$$;

revoke all on function public.enregistrer_copie(uuid, uuid, text, text) from public;
grant execute on function public.enregistrer_copie(uuid, uuid, text, text) to anon, authenticated;
