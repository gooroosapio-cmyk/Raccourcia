-- =====================================================================
-- Catalogue v7 / 200 — menage decide le 24 septembre 2026
--
-- Les commandes archivees partent avec tout ce qui leur tient : lignes du
-- journal des copies, favoris et recents qui les citent, anciens liens.
-- Decision explicite, qui leve pour ce chantier la regle de CLAUDE.md sur
-- le journal. Aucune ne porte de visuel (controle 900).
-- =====================================================================
create temporary table v7_visuels_avant on commit drop as
select count(*) as n from public.prompt_media;

delete from public.prompt_aliases a
 where a.alias_prompt_id in (select id from public.prompts where status = 'archived')
    or a.canonical_prompt_id in (select id from public.prompts where status = 'archived');
delete from public.prompts where status = 'archived';
delete from public.prompt_variants where status = 'archived';
delete from public.prompts where id in (select id from v7_brouillons_exclus);

-- Les brouillons de « Vie quotidienne », collection que le kit ne reprend
-- pas, attendent dans le rayon de transition.
update public.prompts p
   set category_id = (select id from public.categories where external_ref = 'V5-TRANSITION')
  from public.categories c
 where c.id = p.category_id and c.name = 'Vie quotidienne' and c.external_ref like 'V5C-%';

-- Les rangements qui ne servent plus : rayons « Commandes retirees » vides,
-- « Vie quotidienne » et « Mises en scene creatives ».
delete from public.categories c
 where (c.external_ref like 'ARCHIVES-%'
        or (c.external_ref like 'V5C-%' and c.name in ('Vie quotidienne', 'Mises en scène créatives')))
   and not exists (select 1 from public.prompts p where p.category_id = c.id)
   and not exists (select 1 from public.categories e where e.parent_id = c.id);
