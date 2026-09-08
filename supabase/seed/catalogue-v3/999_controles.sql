-- =====================================================================
-- Catalogue V3 — controles bloquants
--
-- Rejoues apres l'import. Chaque ecart leve une exception : mieux vaut un
-- import interrompu qu'un catalogue a moitie publie.
-- =====================================================================

do $ctrl$
declare n integer;
begin
  select count(*) into n from public.prompts where catalog_version = 'v3.0';
  if n <> 555 then raise exception 'Attendu 555 raccourcis en v3.0, trouve %.', n; end if;

  select count(*) into n from public.prompts where source_status = 'new_v3';
  if n <> 245 then raise exception 'Attendu 245 nouveautes, trouve %.', n; end if;

  select count(*) into n from public.prompts p
   where p.external_ref like 'RCI-%' and p.status = 'published'
     and exists (select 1 from public.prompt_variants v where v.prompt_id = p.id
                  and not exists (select 1 from public.prompt_versions pv
                                   where pv.variant_id = v.id and pv.is_current));
  if n <> 0 then raise exception '% raccourcis publies ont une variante sans version courante.', n; end if;

  perform 1 from public.prompt_variants v
    join public.prompts p on p.id = v.prompt_id
   where p.catalog_version = 'v3.0'
   group by v.prompt_id having count(*) <> 3;
  if found then raise exception 'Un raccourci V3 n''a pas exactement trois variantes.'; end if;

  -- Les dix nouveautes offertes. Le total de gratuits n'est pas verifie : il
  -- appartient a l'administration, qui peut en ajouter ou en retirer.
  select count(*) into n from public.prompts
   where source_status = 'new_v3' and is_free and status = 'published';
  if n <> 10 then raise exception 'Attendu 10 nouveautes offertes, trouve %.', n; end if;

  select count(*) into n from public.prompts
   where external_ref in ('RCI-ANA-015','RCI-TXT-030','RCI-TXT-031','RCI-TXT-045','RCI-TXT-046',
                          'RCI-TXT-050','RCI-TXT-066','RCI-TXT-142','RCI-TXT-148','RCI-TXT-190')
     and status <> 'archived';
  if n <> 0 then raise exception '% commandes retirees du V3 sont encore actives.', n; end if;
end $ctrl$;
