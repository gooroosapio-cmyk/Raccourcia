-- =====================================================================
-- Attribution initiale des tags aux commandes
--
-- Trois sources, et trois seulement. Chacune est une donnee deja en base,
-- jamais une deduction sur le nom ou la description d'une commande.
--
-- 1. LA BIBLIOTHEQUE. `prompts.library` vient d'etre etablie par la
--    migration. Certaine par construction.
--
-- 2. LES IA COMPATIBLES. Elles viennent de `prompt_variants`, donc de ce
--    que le catalogue declare reellement. Le brief est explicite : une
--    commande n'est pas compatible avec Gemini parce qu'elle est une image.
--    Seules les variantes publiees et non marquees « non supporte »
--    comptent.
--
-- 3. LES TAGS LIBRES QUI EXISTENT DEJA, et seulement lorsqu'ils portent
--    exactement le slug d'un tag du referentiel. « portrait » devient le
--    tag Portrait ; « photo-produit » ne devient rien, parce qu'aucun tag
--    ne porte ce slug et qu'en inventer un ici reviendrait a recreer le
--    desordre qu'on corrige.
--
-- CE QUI N'EST PAS FAIT. Aucun tag de style, de contexte ou d'experience
-- n'est attribue : rien en base ne permet de dire qu'une commande est
-- « cinematographique » ou « luxueuse » sans lire son visuel ou son texte.
-- Ces tags existent, ils sont vides, et l'administration les posera.
--
-- Rejouable : des insertions sur conflit ignore. Une association posee a la
-- main n'est jamais retiree par ce lot.
-- =====================================================================

-- --- 1. La bibliotheque ------------------------------------------------
insert into public.prompt_tags (prompt_id, tag_id)
select p.id, t.id
from public.prompts p
join public.tags t on t.slug = p.library::text
where p.library is not null
on conflict do nothing;

-- --- 2. Les IA reellement declarees ------------------------------------
insert into public.prompt_tags (prompt_id, tag_id)
select distinct v.prompt_id, t.id
from public.prompt_variants v
join public.ai_providers f on f.id = v.provider_id
join public.tags t on t.slug = f.key
where v.status = 'published'
  and v.compatibility <> 'non_supporte'
  and f.is_active
  and t.groupe = 'ia'
on conflict do nothing;

-- --- 3. Les tags libres qui correspondent exactement --------------------
insert into public.prompt_tags (prompt_id, tag_id)
select distinct p.id, t.id
from public.prompts p
cross join lateral unnest(p.tags) as libre(valeur)
join public.tags t on t.slug = libre.valeur
-- Les tags de bibliotheque et d'IA sont deja poses depuis leur source
-- fiable : les reprendre ici ferait entrer une valeur libre la ou une
-- donnee verifiee existe.
where t.groupe not in ('bibliotheque', 'ia')
on conflict do nothing;

-- --- Rapport -----------------------------------------------------------
do $rapport$
declare
  v_associations integer;
  v_commandes integer;
  v_sans integer;
  v_tags_vides integer;
begin
  select count(*) into v_associations from public.prompt_tags;

  select count(distinct pt.prompt_id) into v_commandes
  from public.prompt_tags pt
  join public.prompts p on p.id = pt.prompt_id
  where p.status = 'published';

  select count(*) into v_sans
  from public.prompts p
  where p.status = 'published'
    and not exists (select 1 from public.prompt_tags pt where pt.prompt_id = p.id);

  select count(*) into v_tags_vides
  from public.tags t
  where not exists (select 1 from public.prompt_tags pt where pt.tag_id = t.id);

  raise notice 'Attribution : % associations, % commandes publiees taguees, % sans aucun tag.',
    v_associations, v_commandes, v_sans;
  raise notice 'Attribution : % tags encore sans commande — a poser depuis l''administration.',
    v_tags_vides;
end $rapport$;
