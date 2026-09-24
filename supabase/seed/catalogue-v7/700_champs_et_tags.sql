-- =====================================================================
-- Catalogue v7 / 700 — champs a completer et tags
--
-- Rejouable sans rien recreer : ne part que ce qui differe du kit, n'arrive
-- que ce qui manque.
-- =====================================================================
create temporary table v7_champ on commit drop as
select p.id as prompt_id, f ->> 'cle' as cle, f ->> 'libelle' as libelle, f ->> 'indication' as indication,
       (f ->> 'kind')::public.prompt_field_kind as kind, (f ->> 'requis')::boolean as requis,
       (f ->> 'position')::smallint as position
from v7_carte k
join public.prompts p on p.card_id = k.card_id
cross join jsonb_array_elements(k.champs) f;

delete from public.prompt_fields f
 using public.prompts p, v7_carte k
 where f.prompt_id = p.id and p.card_id = k.card_id
   and not exists (
     select 1 from v7_champ c
     where c.prompt_id = f.prompt_id and c.cle = f.cle and c.libelle = f.libelle
       and c.indication is not distinct from f.indication and c.kind = f.kind
       and c.requis = f.requis and c.position = f.position);

insert into public.prompt_fields (prompt_id, cle, libelle, indication, kind, requis, position)
select c.prompt_id, c.cle, c.libelle, c.indication, c.kind, c.requis, c.position
from v7_champ c
where not exists (select 1 from public.prompt_fields f where f.prompt_id = c.prompt_id and f.cle = c.cle);

-- Tags des cartes du kit.
create temporary table v7_lien on commit drop as
select p.id as prompt_id, t.id as tag_id
from v7_carte k
join public.prompts p on p.card_id = k.card_id
cross join unnest(k.tags) s(slug)
join public.tags t on t.slug = s.slug;

delete from public.prompt_tags pt
 using public.prompts p, v7_carte k
 where pt.prompt_id = p.id and p.card_id = k.card_id
   and not exists (select 1 from v7_lien l where l.prompt_id = pt.prompt_id and l.tag_id = pt.tag_id);

insert into public.prompt_tags (prompt_id, tag_id)
select prompt_id, tag_id from v7_lien
on conflict do nothing;

-- Tags des brouillons, convertis par migration_tags.csv. Un ancien tag
-- retire (Bibliotheque, IA) ou sans correspondance ne donne rien.
insert into public.prompt_tags (prompt_id, tag_id)
select distinct a.prompt_id, t.id
from v7_anciens_tags_brouillons a
join v7_migration_tag m on m.source_norm = a.source_norm and m.target_slug is not null
join public.tags t on t.slug = m.target_slug
on conflict do nothing;
