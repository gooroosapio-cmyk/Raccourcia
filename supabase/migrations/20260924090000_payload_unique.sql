-- =====================================================================
-- Un payload canonique par commande
--
-- Chaque commande portait une variante par IA, et `resolve_prompt` servait
-- celle de l'IA choisie. La decision est prise : un seul texte, identique
-- quelle que soit l'IA du membre. Sur les 642 cartes du catalogue V5, les
-- trois variantes portent deja le meme texte, mot pour mot — la migration
-- ne choisit rien, elle constate.
--
-- LA STRUCTURE RESTE. Une variante de plus, « universel », porte le texte
-- canonique et son historique de versions ; `prompt_variants` et
-- `prompt_versions` ne changent pas de forme. Les variantes par IA restent
-- publiees tant que l'interface les liste encore : les archiver avant que
-- le selecteur disparaisse couperait la copie. Elles s'archivent dans le
-- lot qui retire le selecteur.
--
-- LA RESOLUTION NE DISCRIMINE PLUS. `resolve_prompt` et `resolve_free_prompt`
-- servent la variante universelle quand elle existe, quelle que soit l'IA
-- demandee. L'IA demandee reste inscrite au journal : savoir ou le membre
-- comptait coller garde un interet. Une commande sans variante universelle
-- — une archive restauree un jour, par exemple — retombe sur l'ancien
-- chemin, par IA, plutot que de refuser.
--
-- Le fournisseur « universel » n'est PAS cree ici mais par le lot
-- `supabase/seed/payload-unique`. Les lots de catalogue deja appliques
-- croisent chaque commande avec tous les fournisseurs, sans filtre : rejoues
-- apres une migration qui l'aurait cree, ils poseraient sur chaque commande
-- une variante universelle vide. Tant que le lot n'a pas tourne, la
-- fonction ci-dessous ne trouve aucune variante universelle et sert
-- l'ancien chemin, par IA — rien ne change avant que le texte soit pose.
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
       join public.ai_providers pr on pr.id = v.provider_id
      where v.prompt_id = p_prompt_id
        and pr.key = 'universel'
        and v.status = 'published'),
    (select v.id
       from public.prompt_variants v
       join public.ai_providers pr on pr.id = v.provider_id
      where v.prompt_id = p_prompt_id
        and pr.key = p_provider_key
        and pr.is_active
        and v.status = 'published')
  )
$$;

revoke all on function public.variante_servie(uuid, text) from public;

comment on function public.variante_servie(uuid, text) is
  'La variante dont le texte est servi : l''universelle si elle existe, '
  'sinon celle de l''IA demandee (commandes anterieures au payload unique).';

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

  -- 5. La variante servie : l'universelle, quelle que soit l'IA demandee.
  v_variant_id := public.variante_servie(v_prompt.id, p_provider_key);

  if v_variant_id is null then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  -- 6. Version courante publiee, et qui porte quelque chose.
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

create or replace function public.resolve_free_prompt(
  p_prompt_id uuid,
  p_provider_key text,
  p_surface text default 'detail'
)
returns table (command text, payload text)
language plpgsql
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
    and exists (
      select 1 from public.categories c where c.id = p.category_id and c.is_visible
    );

  if not found then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  v_variant_id := public.variante_servie(v_prompt.id, p_provider_key);

  if v_variant_id is null then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  select * into v_version
  from public.prompt_versions pv
  where pv.variant_id = v_variant_id
    and pv.is_current
    and pv.status = 'published';

  if not found or coalesce(btrim(v_version.payload), '') = '' then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  insert into public.copy_events (
    user_id, prompt_id, variant_id, version_id, provider_key, surface
  )
  values ((select auth.uid()), v_prompt.id, v_variant_id, v_version.id, p_provider_key, p_surface);

  return query select v_prompt.command::text, v_version.payload;
end;
$$;

revoke all on function public.resolve_free_prompt(uuid, text, text) from public;
grant execute on function public.resolve_free_prompt(uuid, text, text) to anon, authenticated;
