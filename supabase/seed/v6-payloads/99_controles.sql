-- Controle de sortie de la refonte V6.
--
-- Les lots verifient chacun leur tranche. Celui-ci verifie ce qu'aucun lot
-- ne voit : l'etat d'ensemble, et ce qui n'aurait pas du bouger.

do $ctrl$
declare
  v_courantes integer;
  v_sans_courante integer;
  v_anciennes integer;
begin
  select count(*) into v_courantes
  from public.prompt_versions pv
  where pv.is_current and pv.version_label = 'v6-payloads';
  if v_courantes <> 1599 then
    raise exception 'Refonte V6 : % versions courantes sur 1599.', v_courantes;
  end if;

  -- Aucune variante du catalogue, refondue ou non, ne doit rester muette.
  select count(*) into v_sans_courante
  from public.prompt_variants v
  join public.prompts p on p.id = v.prompt_id
  where p.status = 'published'
    and not exists (
      select 1 from public.prompt_versions pv where pv.variant_id = v.id and pv.is_current
    );
  if v_sans_courante > 0 then
    raise exception 'Refonte V6 : % variantes publiees sans version courante.', v_sans_courante;
  end if;

  -- L'historique est conserve : chaque variante refondue garde au moins une
  -- version retiree, celle qu'elle portait avant.
  select count(*) into v_anciennes
  from public.prompt_versions pv
  where pv.status = 'retired' and pv.version_label <> 'v6-payloads';
  if v_anciennes < 1599 then
    raise exception 'Refonte V6 : seulement % versions retirees, l historique est incomplet.', v_anciennes;
  end if;

  raise notice 'Refonte V6 : % payloads courants, historique conserve.', v_courantes;
end $ctrl$;
