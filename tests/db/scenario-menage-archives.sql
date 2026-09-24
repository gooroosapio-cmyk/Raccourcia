-- =====================================================================
-- Scenario du menage des archives (lot `menage-archives`)
--
-- Pose, sur la base de test, un exemplaire de chaque cas que le lot doit
-- trancher. `tests/integration/apres-menage/50_menage_archives.sql`
-- verifie ensuite, cas par cas, ce qui est parti et ce qui est reste.
--
--   5a1  archivee, reliee a rien                       -> supprimee
--   5a2  archivee, citee au journal des copies         -> gardee, rangee
--   5a3  archivee, ancienne adresse redirigee          -> gardee, rangee
--   5a4  archivee, en favori d'un membre               -> gardee, rangee
--   5a5  archivee, avec un visuel                      -> gardee, rangee
--   variante archivee de /testxray, jamais citee        -> supprimee
--   variante archivee de /testfree, citee au journal    -> gardee
--   tag inactif porte par 5a1 et 5a2                    -> supprime
--   rayon et collection v2, ne rangeant que 5a1 et 5a2  -> supprimes
--   collection archivee vide                            -> supprimee
-- =====================================================================
insert into public.categories (id, parent_id, mode, slug, name, status, sort_order, external_ref) values
  ('00000000-0000-0000-0000-0000000005c1', null, 'image', 'essai-v2-rayon', 'Rayon v2 d''essai',
   'published', 900, 'V2CAT-essai'),
  ('00000000-0000-0000-0000-0000000005c2', '00000000-0000-0000-0000-0000000005c1', 'image',
   'essai-v2-collection', 'Collection v2 d''essai', 'published', 900, 'V2COL-essai'),
  ('00000000-0000-0000-0000-0000000005c3', null, 'texte', 'essai-archivee-vide',
   'Collection archivee vide', 'archived', 901, null)
on conflict (id) do nothing;

insert into public.prompts (id, command, slug, name, mode, library, short_description, status, category_id) values
  ('00000000-0000-0000-0000-0000000005a1', '/essai-menage-un', 'essai-menage-un', 'Archivee sans lien',
   'image', 'images', 'Essai', 'archived', '00000000-0000-0000-0000-0000000005c2'),
  ('00000000-0000-0000-0000-0000000005a2', '/essai-menage-deux', 'essai-menage-deux', 'Archivee copiee',
   'image', 'images', 'Essai', 'archived', '00000000-0000-0000-0000-0000000005c2'),
  ('00000000-0000-0000-0000-0000000005a3', '/essai-menage-trois', 'essai-menage-trois', 'Archivee redirigee',
   'texte', 'textes', 'Essai', 'archived', '00000000-0000-0000-0000-0000000000c3'),
  ('00000000-0000-0000-0000-0000000005a4', '/essai-menage-quatre', 'essai-menage-quatre', 'Archivee en favori',
   'texte', 'textes', 'Essai', 'archived', '00000000-0000-0000-0000-0000000000c3'),
  ('00000000-0000-0000-0000-0000000005a5', '/essai-menage-cinq', 'essai-menage-cinq', 'Archivee illustree',
   'image', 'images', 'Essai', 'archived', '00000000-0000-0000-0000-0000000000c1')
on conflict (id) do nothing;

-- Chaque commande archivee a sa variante et sa version, comme en production.
insert into public.prompt_variants (id, prompt_id, provider_id, status)
select ('00000000-0000-0000-0000-0000000005b' || right(p.id::text, 1))::uuid, p.id, a.id, 'published'
from public.prompts p
join public.ai_providers a on a.key = 'chatgpt'
where p.id::text like '00000000-0000-0000-0000-0000000005a_'
on conflict (id) do nothing;

insert into public.prompt_versions (id, variant_id, payload, status, is_current, published_at)
select ('00000000-0000-0000-0000-0000000005d' || right(v.id::text, 1))::uuid, v.id,
       'Texte d''essai du menage', 'published', true, now()
from public.prompt_variants v
where v.id::text like '00000000-0000-0000-0000-0000000005b_'
on conflict (id) do nothing;

-- Un champ, son choix et une question sur la commande qui part.
insert into public.prompt_fields (id, prompt_id, cle, libelle, kind, requis, position) values
  ('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-0000000005a1', 'style', 'Style',
   'liste', false, 1)
on conflict (id) do nothing;
insert into public.prompt_field_choices (field_id, valeur, libelle, position)
select '00000000-0000-0000-0000-0000000005f1', 'sobre', 'Sobre', 1
where not exists (select 1 from public.prompt_field_choices
                  where field_id = '00000000-0000-0000-0000-0000000005f1');
insert into public.prompt_questions (prompt_id, sort_order, variable, question)
select '00000000-0000-0000-0000-0000000005a1', 1, 'style', 'Quel style ?'
where not exists (select 1 from public.prompt_questions
                  where prompt_id = '00000000-0000-0000-0000-0000000005a1');

-- 5a2 : copiee par le membre actif. Le journal cite sa commande, sa
-- variante et sa version.
insert into public.copy_events (id, user_id, prompt_id, variant_id, version_id, provider_key, surface)
values ('00000000-0000-0000-0000-0000000005e2', '00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-0000000005a2', '00000000-0000-0000-0000-0000000005b2',
        '00000000-0000-0000-0000-0000000005d2', 'chatgpt', 'detail')
on conflict (id) do nothing;

-- 5a3 : son ancienne adresse mene a /testxray.
insert into public.prompt_aliases (alias_prompt_id, canonical_prompt_id)
select '00000000-0000-0000-0000-0000000005a3', '00000000-0000-0000-0000-0000000000d1'
where not exists (select 1 from public.prompt_aliases
                  where alias_prompt_id = '00000000-0000-0000-0000-0000000005a3');

-- 5a4 : en favori.
insert into public.favorites (user_id, prompt_id)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000005a4')
on conflict do nothing;

-- 5a5 : un visuel. Un lot n'efface jamais un visuel.
insert into public.prompt_media (prompt_id, kind, storage_path, sort_order)
select '00000000-0000-0000-0000-0000000005a5', 'after', 'prompts/essai-menage/after.png', 0
where not exists (select 1 from public.prompt_media
                  where prompt_id = '00000000-0000-0000-0000-0000000005a5');

-- Deux variantes archivees sur des commandes publiees : l'une jamais
-- citee, l'autre citee par une copie.
insert into public.prompt_variants (id, prompt_id, provider_id, status)
select v.id::uuid, v.prompt_id::uuid, a.id, 'archived'
from (values
  ('00000000-0000-0000-0000-0000000005b8', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000005b9', '00000000-0000-0000-0000-0000000000d2')
) v(id, prompt_id)
join public.ai_providers a on a.key = 'claude'
on conflict do nothing;
insert into public.prompt_versions (id, variant_id, payload, status, is_current, published_at)
select ('00000000-0000-0000-0000-0000000005d' || right(v.id::text, 1))::uuid, v.id,
       'Ancien texte par IA', 'published', true, now()
from public.prompt_variants v
where v.id in ('00000000-0000-0000-0000-0000000005b8', '00000000-0000-0000-0000-0000000005b9')
on conflict (id) do nothing;
insert into public.copy_events (id, user_id, prompt_id, variant_id, version_id, provider_key, surface)
values ('00000000-0000-0000-0000-0000000005e9', '00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000005b9',
        '00000000-0000-0000-0000-0000000005d9', 'claude', 'detail')
on conflict (id) do nothing;

-- Un tag inactif, porte seulement par des commandes archivees.
insert into public.tags (id, slug, name, groupe, is_active)
values ('00000000-0000-0000-0000-0000000005aa', 'essai-tag-inactif', 'Tag inactif', 'autre', false)
on conflict (id) do nothing;
insert into public.prompt_tags (prompt_id, tag_id)
select p, '00000000-0000-0000-0000-0000000005aa'::uuid
from unnest(array['00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000005a2']::uuid[]) p
on conflict do nothing;
