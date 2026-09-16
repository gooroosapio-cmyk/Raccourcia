-- =====================================================================
-- Une variante par moteur, pour chaque carte du catalogue V2.
--
-- Rejouable : la clause `not exists` reconnait ce qui est deja pose. Une
-- carte qui avait deja ses variantes — les 77 conservees de l'ancien
-- catalogue — n'en recoit pas de seconde.
-- =====================================================================

insert into public.prompt_variants (prompt_id, provider_id, compatibility, status)
select p.id, pr.id, 'excellent'::public.compatibility_level, 'published'::public.content_status
from public.prompts p
cross join public.ai_providers pr
where p.catalog_v2
  and pr.key in ('chatgpt', 'gemini', 'claude')
  and pr.is_active
  and not exists (
    select 1 from public.prompt_variants v
    where v.prompt_id = p.id and v.provider_id = pr.id
  );

do $ctrl$
declare
  v_sans integer;
begin
  select count(*) into v_sans
  from public.prompts p
  where p.catalog_v2
    and (select count(*) from public.prompt_variants v where v.prompt_id = p.id) < 3;
  if v_sans <> 0 then
    raise exception 'Moteur V3 : % cartes n ont pas leurs trois variantes.', v_sans;
  end if;
end $ctrl$;
