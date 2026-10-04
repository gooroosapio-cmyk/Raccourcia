-- Catalogue v7.1 / 700 — champs a completer et tags. N'ajoute que ce qui
-- manque.
insert into public.prompt_fields (prompt_id, cle, libelle, indication, kind, requis, position)
select p.id, f ->> 'cle', f ->> 'libelle', f ->> 'indication', (f ->> 'kind')::public.prompt_field_kind,
       (f ->> 'requis')::boolean, (f ->> 'position')::smallint
from v71_carte k
join public.prompts p on p.card_id = k.card_id
cross join jsonb_array_elements(k.champs) f
where not exists (select 1 from public.prompt_fields x where x.prompt_id = p.id and x.cle = f ->> 'cle');

insert into public.prompt_tags (prompt_id, tag_id)
select p.id, t.id
from v71_carte k
join public.prompts p on p.card_id = k.card_id
cross join unnest(k.tags) s(slug)
join public.tags t on t.slug = s.slug
on conflict do nothing;
