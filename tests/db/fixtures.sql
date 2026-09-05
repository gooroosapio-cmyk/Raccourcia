-- Jeu de donnees deterministe pour les tests d'integration.
-- UUID fixes afin que les assertions restent lisibles.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'membre-actif@test.raccourcia'),
  ('00000000-0000-0000-0000-0000000000a2', 'membre-sans-acces@test.raccourcia'),
  ('00000000-0000-0000-0000-0000000000a3', 'admin@test.raccourcia'),
  ('00000000-0000-0000-0000-0000000000a4', 'super-admin@test.raccourcia');

insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-0000000000a3', 'admin'),
  ('00000000-0000-0000-0000-0000000000a4', 'admin'),
  ('00000000-0000-0000-0000-0000000000a4', 'super_admin');

-- Le membre actif possede un droit a vie ; le second n'a rien.
insert into public.entitlements (user_id, product_id, access_type, status)
select '00000000-0000-0000-0000-0000000000a1', p.id, 'lifetime', 'active'
from public.products p where p.slug = 'acces-a-vie';

-- Sessions applicatives (claim session_id du JWT).
insert into public.app_sessions (user_id, auth_session_id, device_label, status) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1',
   'Telephone de test', 'active'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f2',
   'Telephone sans acces', 'active'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f3',
   'Session revoquee', 'revoked');

-- Taxonomie : une categorie parente, une sous-categorie.
insert into public.categories (id, parent_id, mode, slug, name, status, sort_order) values
  ('00000000-0000-0000-0000-0000000000c1', null, 'image', 'test-visualisation',
   'Visualisation', 'published', 1),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c1', 'image',
   'test-produit', 'Produit', 'published', 1),
  ('00000000-0000-0000-0000-0000000000c3', null, 'texte', 'test-redaction',
   'Redaction', 'published', 2);

insert into public.prompts
  (id, external_ref, command, name, slug, mode, category_id, short_description, status,
   is_free, published_at)
values
  ('00000000-0000-0000-0000-0000000000d1', 'TEST-001', '/testxray', 'Vue X-ray de test',
   'testxray', 'image', '00000000-0000-0000-0000-0000000000c2',
   'Prompt premium de test.', 'published', false, now()),
  ('00000000-0000-0000-0000-0000000000d2', 'TEST-002', '/testfree', 'Raccourci gratuit',
   'testfree', 'image', '00000000-0000-0000-0000-0000000000c1',
   'Prompt gratuit de demonstration.', 'published', true, now()),
  ('00000000-0000-0000-0000-0000000000d3', 'TEST-003', '/testdraft', 'Brouillon',
   'testdraft', 'texte', '00000000-0000-0000-0000-0000000000c3',
   'Prompt non publie.', 'draft', false, null);

insert into public.prompt_variants (id, prompt_id, provider_id, status)
select
  ('00000000-0000-0000-0000-0000000000e' || row_number() over (order by p.id, pr.sort_order))::uuid,
  p.id, pr.id, 'published'
from public.prompts p
cross join public.ai_providers pr
where p.id in (
  '00000000-0000-0000-0000-0000000000d1',
  '00000000-0000-0000-0000-0000000000d2',
  '00000000-0000-0000-0000-0000000000d3'
)
  and pr.key in ('chatgpt', 'gemini');

insert into public.prompt_versions (variant_id, payload, status, is_current, published_at)
select v.id, '[RaccourcIA - payload de test] contenu premium', 'published', true, now()
from public.prompt_variants v;
