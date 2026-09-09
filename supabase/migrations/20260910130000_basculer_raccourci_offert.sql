-- =====================================================================
-- RaccourcIA - Basculer un raccourci offert depuis la liste
--
-- Le palier d'essai se decidait jusqu'ici en ouvrant la fiche d'un
-- raccourci, un a un. C'est pourtant en parcourant le catalogue qu'on
-- voit lesquels valent d'etre offerts — et ouvrir une fiche pour cocher
-- une case fait perdre sa place dans une liste de 565.
--
-- La fonction porte le controle de role et la trace, comme ses voisines.
-- Rien de ce qui vit dans l'interface ne fait autorite : un formulaire
-- contourne rencontre le meme refus.
-- =====================================================================

create or replace function public.admin_set_prompt_free(p_prompt_id uuid, p_free boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_avant boolean;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select is_free into v_avant from public.prompts where id = p_prompt_id;

  if v_avant is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.prompts
     set is_free = p_free, updated_at = now(), updated_by = (select auth.uid())
   where id = p_prompt_id;

  perform public.admin_log(
    'raccourci.offert', 'prompt', p_prompt_id,
    jsonb_build_object('is_free', v_avant),
    jsonb_build_object('is_free', p_free)
  );
end;
$$;

revoke all on function public.admin_set_prompt_free(uuid, boolean) from public, anon;
grant execute on function public.admin_set_prompt_free(uuid, boolean) to authenticated;
