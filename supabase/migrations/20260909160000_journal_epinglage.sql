-- =====================================================================
-- RaccourcIA - Correction du journal d'epinglage
--
-- `admin_set_prompt_pinned` ecrivait dans `admin_audit_logs (actor_id,
-- payload)`. Ces colonnes n'existent pas : la table porte `admin_user_id`,
-- `before_data` et `after_data`. Le corps d'une fonction PL/pgSQL n'est pas
-- verifie a la creation, la migration precedente est donc passee sans bruit
-- et l'etoile echouait au premier clic.
--
-- On repasse par `admin_log`, comme les autres operations d'administration :
-- une seule facon d'ecrire dans le journal, donc une seule a maintenir.
-- =====================================================================

create or replace function public.admin_set_prompt_pinned(p_prompt_id uuid, p_pinned boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_avant boolean;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using hint = 'Role administrateur requis.';
  end if;

  select is_pinned into v_avant from public.prompts where id = p_prompt_id;

  if v_avant is null then
    raise exception 'NOT_FOUND' using hint = 'Raccourci introuvable.';
  end if;

  update public.prompts
     set is_pinned = p_pinned, updated_at = now()
   where id = p_prompt_id;

  perform public.admin_log(
    case when p_pinned then 'prompt_pinned' else 'prompt_unpinned' end,
    'prompt',
    p_prompt_id,
    jsonb_build_object('is_pinned', v_avant),
    jsonb_build_object('is_pinned', p_pinned));
end;
$$;

revoke all on function public.admin_set_prompt_pinned(uuid, boolean) from public, anon;
grant execute on function public.admin_set_prompt_pinned(uuid, boolean) to authenticated;
