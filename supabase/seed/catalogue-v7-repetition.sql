-- =====================================================================
-- Catalogue v7 — repetition sur la base reelle, annulee
--
-- Remplace le lot 999 : tout le catalogue v7 s'est ecrit et ses controles
-- sont passes, puis cette levee annule la transaction. Rien n'est garde ;
-- le message rend ce qui aurait ete ecrit.
-- =====================================================================
do $repetition$
begin
  raise exception 'REPETITION v7 (annulee) : %', (select row_to_json(x) from (select
    (select count(*) from public.prompts where status = 'published') as publiees,
    (select count(*) from public.prompts where status = 'draft') as brouillons,
    (select count(*) from public.prompts where status = 'archived') as archivees,
    (select count(*) from public.tags) as tags,
    (select count(*) from public.prompt_tags) as liens_de_tags,
    (select count(*) from public.prompt_fields) as champs,
    (select count(*) from public.categories where parent_id is not null and status <> 'archived') as collections,
    (select count(*) from public.prompt_media) as visuels,
    (select count(*) from public.copy_events) as copies_du_journal,
    (select count(*) from public.favorites) as favoris) x);
end $repetition$;
