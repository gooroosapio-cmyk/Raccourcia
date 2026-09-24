-- =====================================================================
-- Catalogue v7 / 400 — les 72 tags du kit remplacent les anciens
--
-- Les anciens tags des brouillons sont notes avant l'effacement : ils se
-- convertissent ensuite par migration_tags.csv (lot 700).
-- =====================================================================
create temporary table v7_anciens_tags_brouillons on commit drop as
select pt.prompt_id, public.texte_normalise(t.name) as source_norm
from public.prompt_tags pt
join public.tags t on t.id = pt.tag_id
join public.prompts p on p.id = pt.prompt_id and p.status = 'draft';

delete from public.tags t where not exists (select 1 from v7_tag k where k.slug = t.slug);

insert into public.tags (slug, name, groupe, description, is_active, sort_order)
select slug, name, groupe, description, true, sort_order from v7_tag
on conflict (slug) do update
  set name = excluded.name, groupe = excluded.groupe, description = excluded.description,
      is_active = true, sort_order = excluded.sort_order;
