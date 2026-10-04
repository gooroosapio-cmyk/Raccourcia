-- =====================================================================
-- Catalogue v7.1 / 100 — apercu, avant toute ecriture
--
-- Une carte deja inseree par un passage precedent porte le meme card_id :
-- c'est la meme carte, pas une collision. Tout autre recouvrement leve.
-- =====================================================================
create temporary table v71_collection on commit drop as
select distinct k.collection, k.rayon_ref, c.id as category_id
from v71_carte k
join public.categories r on r.external_ref = k.rayon_ref
left join public.categories c on c.parent_id = r.id and c.name = k.collection and c.status = 'published';

do $apercu$
declare v_n integer;
begin
  if (select count(*) from v71_carte) <> 200 then
    raise exception 'Catalogue v7.1 : le fichier charge ne compte pas 200 cartes.';
  end if;
  if exists (select 1 from v71_collection where category_id is null) then
    raise exception 'Catalogue v7.1 : collection(s) introuvable(s) : %',
      (select string_agg(collection, ', ') from v71_collection where category_id is null);
  end if;

  select count(*) into v_n from v71_carte k
  where exists (
    select 1 from public.prompts p
    where p.card_id is distinct from k.card_id
      and (p.slug = k.slug or p.card_code = k.card_code or p.external_ref = k.external_ref
           or (p.command::text = k.command and coalesce(p.card_slug, '') = k.card_slug)));
  if v_n > 0 then
    raise exception 'Catalogue v7.1 : % carte(s) heurtent une carte existante.', v_n;
  end if;

  select count(*) into v_n from v71_carte k
  join public.prompts p on p.card_id = k.card_id
  where p.card_code is distinct from k.card_code;
  if v_n > 0 then
    raise exception 'Catalogue v7.1 : % card_id deja en base sous un autre code.', v_n;
  end if;

  select count(*) into v_n from v71_carte k
  where exists (select 1 from unnest(k.tags) s(slug)
                where not exists (select 1 from public.tags t where t.slug = s.slug));
  if v_n > 0 then
    raise exception 'Catalogue v7.1 : % carte(s) portent un tag absent de la taxonomie.', v_n;
  end if;
end $apercu$;

-- Le bilan : rien ne part, tout arrive.
select
  (select count(*) from v71_carte k where not exists (select 1 from public.prompts p where p.card_id = k.card_id)) as cartes_a_ajouter,
  (select count(*) from v71_carte k where exists (select 1 from public.prompts p where p.card_id = k.card_id)) as cartes_deja_presentes,
  0 as suppressions;
