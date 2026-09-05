-- =====================================================================
-- RaccourcIA - 11. Operations d'administration
--
-- Les regles de publication et de versionnement vivent ici, pas dans
-- l'interface : un formulaire contourne ne doit pas pouvoir publier un
-- raccourci incomplet ni ecraser une version existante.
-- =====================================================================

-- Journalise une action sensible. Appelee par les fonctions ci-dessous.
create or replace function public.admin_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_before jsonb default null,
  p_after jsonb default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_logs
    (admin_user_id, action, entity_type, entity_id, before_data, after_data)
  values ((select auth.uid()), p_action, p_entity_type, p_entity_id, p_before, p_after);
$$;

revoke all on function public.admin_log(text, text, uuid, jsonb, jsonb)
  from public, anon, authenticated;

/**
 * Cree une nouvelle version de payload pour une variante.
 *
 * Modifier un prompt ne detruit jamais la version precedente : l'ancienne
 * passe en `retired`, la nouvelle devient courante (Blueprint Backend V1, 7.3).
 */
create or replace function public.admin_new_prompt_version(
  p_variant_id uuid,
  p_payload text,
  p_qcm jsonb default '[]'::jsonb,
  p_qcm_trigger text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new_id uuid;
  v_previous public.prompt_versions%rowtype;
  v_label text;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if coalesce(trim(p_payload), '') = '' then
    raise exception 'PAYLOAD_REQUIRED' using errcode = '23514';
  end if;

  select * into v_previous
  from public.prompt_versions
  where variant_id = p_variant_id and is_current;

  -- Numerotation simple et lisible : v1.0, v2.0, v3.0...
  v_label := 'v' || (
    select coalesce(count(*), 0) + 1 from public.prompt_versions where variant_id = p_variant_id
  ) || '.0';

  if found then
    update public.prompt_versions
    set is_current = false, status = 'retired'
    where id = v_previous.id;
  end if;

  insert into public.prompt_versions
    (variant_id, version_label, payload, qcm, qcm_trigger, status, is_current, published_at, created_by)
  values
    (p_variant_id, v_label, p_payload, coalesce(p_qcm, '[]'::jsonb), p_qcm_trigger,
     'published', true, now(), (select auth.uid()))
  returning id into v_new_id;

  perform public.admin_log(
    'version.creee', 'prompt_version', v_new_id,
    case when v_previous.id is null then null
         else jsonb_build_object('version_precedente', v_previous.version_label) end,
    jsonb_build_object('version', v_label)
  );

  return v_new_id;
end;
$$;

revoke all on function public.admin_new_prompt_version(uuid, text, jsonb, text)
  from public, anon;
grant execute on function public.admin_new_prompt_version(uuid, text, jsonb, text) to authenticated;

/**
 * Publie un raccourci apres controle.
 *
 * Les criteres viennent du Document Technique V1, 7.3 : commande, description,
 * categorie, et au moins une variante publiee possedant une version courante.
 * Publier un contenu incomplet est refuse par la base elle-meme.
 */
create or replace function public.admin_publish_prompt(p_prompt_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prompt public.prompts%rowtype;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_prompt from public.prompts where id = p_prompt_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_prompt.category_id is null then
    raise exception 'CATEGORIE_REQUISE' using errcode = '23514';
  end if;

  if coalesce(trim(v_prompt.short_description), '') = '' then
    raise exception 'DESCRIPTION_REQUISE' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.prompt_variants v
    join public.prompt_versions pv on pv.variant_id = v.id
    where v.prompt_id = p_prompt_id
      and v.status = 'published'
      and pv.is_current
      and pv.status = 'published'
  ) then
    raise exception 'VERSION_REQUISE' using errcode = '23514';
  end if;

  update public.prompts
  set status = 'published',
      published_at = coalesce(published_at, now()),
      updated_by = (select auth.uid())
  where id = p_prompt_id;

  perform public.admin_log(
    'raccourci.publie', 'prompt', p_prompt_id,
    jsonb_build_object('statut', v_prompt.status),
    jsonb_build_object('statut', 'published')
  );
end;
$$;

revoke all on function public.admin_publish_prompt(uuid) from public, anon;
grant execute on function public.admin_publish_prompt(uuid) to authenticated;

/** Retire un raccourci de la bibliotheque sans jamais le supprimer. */
create or replace function public.admin_set_prompt_status(
  p_prompt_id uuid,
  p_status public.content_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.content_status;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_status = 'published' then
    -- Publier passe obligatoirement par les controles de qualite.
    perform public.admin_publish_prompt(p_prompt_id);
    return;
  end if;

  select status into v_before from public.prompts where id = p_prompt_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.prompts
  set status = p_status, updated_by = (select auth.uid())
  where id = p_prompt_id;

  perform public.admin_log(
    'raccourci.statut', 'prompt', p_prompt_id,
    jsonb_build_object('statut', v_before),
    jsonb_build_object('statut', p_status)
  );
end;
$$;

revoke all on function public.admin_set_prompt_status(uuid, public.content_status)
  from public, anon;
grant execute on function public.admin_set_prompt_status(uuid, public.content_status) to authenticated;

/**
 * Change le statut d'une categorie.
 *
 * Desactiver une categorie masque immediatement toute sa descendance cote
 * utilisateur, sans rien supprimer : la cascade est portee par les triggers
 * de visibilite, cette fonction n'ajoute que le controle et la trace.
 */
create or replace function public.admin_set_category_status(
  p_category_id uuid,
  p_status public.content_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.content_status;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select status into v_before from public.categories where id = p_category_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.categories
  set status = p_status, updated_by = (select auth.uid())
  where id = p_category_id;

  perform public.admin_log(
    'categorie.statut', 'category', p_category_id,
    jsonb_build_object('statut', v_before),
    jsonb_build_object('statut', p_status)
  );
end;
$$;

revoke all on function public.admin_set_category_status(uuid, public.content_status)
  from public, anon;
grant execute on function public.admin_set_category_status(uuid, public.content_status) to authenticated;

/**
 * Accorde ou retire l'acces a vie d'un compte, pour le support.
 * Le compte et l'achat sont toujours conserves.
 */
create or replace function public.admin_set_access(
  p_user_id uuid,
  p_active boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select id into v_product_id from public.products where slug = 'acces-a-vie';
  if v_product_id is null then
    raise exception 'PRODUIT_INTROUVABLE' using errcode = 'P0002';
  end if;

  insert into public.entitlements (user_id, product_id, access_type, status, revoked_reason)
  values (
    p_user_id, v_product_id, 'lifetime',
    (case when p_active then 'active' else 'revoked' end)::public.entitlement_status,
    case when p_active then null else p_reason end
  )
  on conflict (user_id, product_id) do update
    set status =
          (case when p_active then 'active' else 'revoked' end)::public.entitlement_status,
        revoked_reason = case when p_active then null else p_reason end;

  perform public.admin_log(
    case when p_active then 'acces.accorde' else 'acces.retire' end,
    'entitlement', p_user_id, null,
    jsonb_build_object('actif', p_active, 'motif', p_reason)
  );
end;
$$;

revoke all on function public.admin_set_access(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_access(uuid, boolean, text) to authenticated;

/**
 * Lecture des payloads pour le back-office.
 *
 * `prompt_versions` reste sans privilege SQL pour tous les roles clients,
 * administrateurs compris : la table n'est jamais interrogeable directement.
 * L'edition passe donc par cette fonction, qui verifie le role et ne renvoie
 * que la version courante de chaque IA pour un seul raccourci.
 */
create or replace function public.admin_get_prompt_versions(p_prompt_id uuid)
returns table (
  variant_id uuid,
  provider_key text,
  provider_name text,
  compatibility public.compatibility_level,
  variant_status public.content_status,
  version_id uuid,
  version_label text,
  payload text,
  qcm jsonb,
  qcm_trigger text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
    select v.id, pr.key, pr.name, v.compatibility, v.status,
           pv.id, pv.version_label, pv.payload, pv.qcm, pv.qcm_trigger
    from public.prompt_variants v
    join public.ai_providers pr on pr.id = v.provider_id
    left join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
    where v.prompt_id = p_prompt_id
    order by pr.sort_order;
end;
$$;

revoke all on function public.admin_get_prompt_versions(uuid) from public, anon;
grant execute on function public.admin_get_prompt_versions(uuid) to authenticated;
