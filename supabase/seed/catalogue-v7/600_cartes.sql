-- =====================================================================
-- Catalogue v7 / 600 — les cartes
--
-- Nouvelles : inserees et publiees (decision du 24 septembre). Publiees :
-- seul ce que le kit modifie change — contexte, texte, champs, intention.
-- Nom, slug, commande, acces, rangement et resume public restent ceux du
-- site. Le texte unique est porte par la variante « universel » ; l'ancien
-- texte reste dans l'historique des versions.
-- =====================================================================
insert into public.prompts (
  card_id, card_code, command_id, external_ref, command, name, slug, card_slug, mode, library,
  entity_type, category_id, short_description, result_summary, intention, use_cases,
  expected_input, identity_policy, input_type, output_type, output_formats, images_min,
  default_ratio, organisation_sortie, show_image_card, regime_champs, fiche_champs_max,
  is_free, status, published_at, catalog_version, revised_at)
select k.card_id, k.card_code, k.command_id, k.card_code, k.command, k.name, k.slug, k.card_slug,
       k.mode, k.library, k.entity_type, c.category_id, k.short_description, k.result_summary,
       k.intention, k.use_cases, k.expected_input, k.identity_policy, k.input_type, k.output_type,
       k.output_formats, k.images_min, k.default_ratio, k.organisation_sortie, k.show_image_card,
       k.regime_champs, k.fiche_champs_max, k.is_free, 'published', now(), 'v7', k.revised_at
from v7_carte k
join v7_collection c on c.collection = k.collection and c.rayon_ref = k.rayon_ref
where not k.publiee
  and not exists (select 1 from public.prompts p where p.card_id = k.card_id);

update public.prompts p
   set card_code = k.card_code,
       command_id = k.command_id,
       intention = k.intention,
       expected_input = k.expected_input,
       identity_policy = k.identity_policy,
       input_type = case when p.library = 'images' then k.input_type else p.input_type end,
       default_ratio = k.default_ratio,
       organisation_sortie = coalesce(k.organisation_sortie, p.organisation_sortie),
       regime_champs = k.regime_champs,
       fiche_champs_max = k.fiche_champs_max,
       catalog_version = 'v7',
       revised_at = k.revised_at
  from v7_carte k
 where k.publiee and p.card_id = k.card_id
   and (p.card_code, p.command_id, p.intention, p.expected_input, p.identity_policy,
        p.input_type, p.default_ratio, p.regime_champs, p.fiche_champs_max, p.catalog_version)
       is distinct from
       (k.card_code, k.command_id, k.intention, k.expected_input, k.identity_policy,
        case when p.library = 'images' then k.input_type else p.input_type end, k.default_ratio,
        k.regime_champs, k.fiche_champs_max, 'v7');

-- Le texte unique.
insert into public.prompt_variants (prompt_id, provider_id, status, compatibility)
select p.id, a.id, 'published', 'bon'
from v7_carte k
join public.prompts p on p.card_id = k.card_id
cross join public.ai_providers a
where a.key = 'universel'
on conflict (prompt_id, provider_id) do update set status = 'published', updated_at = now()
  where public.prompt_variants.status <> 'published';

update public.prompt_versions pv
   set is_current = false, status = 'retired', updated_at = now()
  from public.prompt_variants v
  join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
  join public.prompts p on p.id = v.prompt_id
  join v7_carte k on k.card_id = p.card_id
 where pv.variant_id = v.id and pv.is_current and pv.payload is distinct from k.payload;

insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
select v.id, 'v7', k.payload, 'published', true, now()
from v7_carte k
join public.prompts p on p.card_id = k.card_id
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
where not exists (select 1 from public.prompt_versions x where x.variant_id = v.id and x.is_current);
