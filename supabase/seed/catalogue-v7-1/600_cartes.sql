-- Catalogue v7.1 / 600 — insertion, publication et texte unique.
create temporary table v71_avant on commit drop as
select (select count(*) from public.prompts) as cartes, (select count(*) from public.prompt_media) as visuels,
       (select count(*) from public.tags) as tags, (select count(*) from public.categories) as rangements,
       (select count(*) from v71_carte k
         where exists (select 1 from public.prompts p where p.card_id = k.card_id)) as deja_presentes;

insert into public.prompts (
  card_id, card_code, command_id, external_ref, command, name, slug, card_slug, mode, library,
  entity_type, category_id, short_description, result_summary, intention, expected_input,
  identity_policy, input_type, output_type, output_formats, images_min, default_ratio,
  organisation_sortie, show_image_card, regime_champs, fiche_champs_max, is_free, status,
  published_at, catalog_version, revised_at)
select k.card_id, k.card_code, k.command_id, k.external_ref, k.command, k.name, k.slug, k.card_slug,
       'image', 'images', 'commande_image', c.category_id, k.short_description, k.result_summary,
       k.intention, k.expected_input, k.identity_policy, k.input_type, 'image', '{image}', 1,
       k.default_ratio, 'image_unique', true, k.regime_champs, k.fiche_champs_max, false,
       'published', now(), 'v7.1', k.revised_at
from v71_carte k
join v71_collection c on c.collection = k.collection and c.rayon_ref = k.rayon_ref
where not exists (select 1 from public.prompts p where p.card_id = k.card_id);

insert into public.prompt_variants (prompt_id, provider_id, status, compatibility)
select p.id, a.id, 'published', 'bon'
from v71_carte k
join public.prompts p on p.card_id = k.card_id
cross join public.ai_providers a
where a.key = 'universel'
on conflict (prompt_id, provider_id) do nothing;

insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
select v.id, 'v7.1', k.payload, 'published', true, now()
from v71_carte k
join public.prompts p on p.card_id = k.card_id
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
where not exists (select 1 from public.prompt_versions x where x.variant_id = v.id and x.is_current);
