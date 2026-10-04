-- =====================================================================
-- Catalogue v7.1 — repetition sur la base reelle, annulee
--
-- Remplace le lot 999 : tout s'est ecrit et les controles sont passes ;
-- cette levee annule la transaction et rend ce qui aurait ete ecrit.
-- =====================================================================
do $repetition$
begin
  raise exception 'REPETITION v7.1 (annulee) : %', (select row_to_json(x) from (select
    (select count(*) from public.prompts where status = 'published') as publiees,
    (select count(*) from public.prompts where status = 'draft') as brouillons,
    (select count(*) from v71_carte k join public.prompts p on p.card_id = k.card_id) as cartes_du_lot,
    (select count(*) from public.prompt_fields f join public.prompts p on p.id = f.prompt_id
       join v71_carte k on k.card_id = p.card_id) as champs_du_lot,
    (select count(*) from public.prompt_tags t join public.prompts p on p.id = t.prompt_id
       join v71_carte k on k.card_id = p.card_id) as tags_du_lot,
    (select count(*) from public.prompt_media) as visuels) x);
end $repetition$;
