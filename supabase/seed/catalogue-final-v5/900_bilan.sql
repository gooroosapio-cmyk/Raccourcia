-- =====================================================================
-- Lot 900 — le bilan de la refonte
--
-- Ce lot n'ecrit rien non plus. Il compte ce que les lots precedents ont
-- produit et leve si le compte n'y est pas. Une refonte qui ne se compte
-- pas n'est pas une refonte terminee.
--
-- Une exception, voulue : les cartes actives hors V5 sont signalees, pas
-- condamnees. Une carte apparue depuis l'extraction est absente du
-- manifeste, et une carte absente du manifeste ne doit pas etre archivee
-- par un lot qui ne sait rien d'elle. On la compte, on la nomme, on
-- tranche a la main.
-- =====================================================================

begin;

select 'cartes V5 en base' as controle, count(*) as n from public.prompts where catalog_version = 'v5';

select p.status as statut, count(*) as cartes from public.prompts p
where p.catalog_version = 'v5' group by 1 order by 1;

select c.name as rayon, count(*) as cartes from public.prompts p
join public.categories c on c.id = p.category_id
where p.catalog_version = 'v5' group by 1 order by 2 desc;

select 'visuels preserves' as controle, count(*) as fichiers from public.prompt_media;

select 'cartes actives hors V5' as controle, count(*) as n from public.prompts
where catalog_version is distinct from 'v5' and status <> 'archived';

do $ctrl$
begin
  if not ((select count(*) from public.prompts where catalog_version = 'v5') = 642) then
    raise exception 'Lot 900 : la refonte devait produire 642 cartes.';
  end if;
end $ctrl$;

do $ctrl$
begin
  if not ((select count(*) from public.prompts where catalog_version = 'v5' and status = 'published') = 349) then
    raise exception 'Lot 900 : 349 cartes devaient etre publiees.';
  end if;
end $ctrl$;

do $ctrl$
begin
  if not ((select count(*) from public.prompts where catalog_version = 'v5' and status = 'draft') = 293) then
    raise exception 'Lot 900 : 293 cartes devaient rester en brouillon.';
  end if;
end $ctrl$;

do $ctrl$
begin
  if not ((select count(*) from public.prompt_media) = 1064) then
    raise exception 'Lot 900 : le nombre de visuels a change. La refonte ne devait en toucher aucun.';
  end if;
end $ctrl$;

do $reste$
declare
  v_n integer;
begin
  select count(*) into v_n from public.prompts
  where catalog_version is distinct from 'v5' and status <> 'archived';
  if v_n > 0 then
    raise notice 'Cartes actives hors V5 : % — apparues depuis l''extraction. '
      'A trancher une par une ; la refonte ne les archive pas.', v_n;
  end if;
end $reste$;

commit;
