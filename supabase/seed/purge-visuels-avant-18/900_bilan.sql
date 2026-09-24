-- Lot 900 — bilan. N'ecrit rien.
select 'visuels restants' as quoi, count(*) as n from public.prompt_media
union all select 'visuels anterieurs au seuil', count(*) from public.prompt_media where created_at < '2026-09-18T00:00:00Z'
union all select 'cartes publiees Visuels avec visuel', count(distinct p.id) from public.prompts p
  join public.prompt_media m on m.prompt_id = p.id where p.status = 'published' and p.library = 'images'
union all select 'cartes publiees Visuels sans visuel', count(*) from public.prompts p
  where p.status = 'published' and p.library = 'images'
    and not exists (select 1 from public.prompt_media m where m.prompt_id = p.id);
