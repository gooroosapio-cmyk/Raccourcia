-- =====================================================================
-- RaccourcIA - 09. Buckets de stockage et donnees de reference
-- Les visuels ne vivent pas dans le depot Git (Blueprint Backend V1, 9).
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-assets', 'public-assets', true, 5242880,
    array['image/webp', 'image/avif', 'image/png', 'image/jpeg', 'image/svg+xml']),
  ('category-media', 'category-media', true, 5242880,
    array['image/webp', 'image/avif', 'image/png', 'image/jpeg']),
  ('prompt-media', 'prompt-media', true, 10485760,
    array['image/webp', 'image/avif', 'image/png', 'image/jpeg']),
  ('admin-temp', 'admin-temp', false, 20971520, null)
on conflict (id) do nothing;

-- Lecture publique des visuels du catalogue : ils font partie de la preuve
-- de valeur partageable. Seuls les admins ecrivent.
create policy "storage_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('public-assets', 'category-media', 'prompt-media'));

create policy "storage_admin_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('public-assets', 'category-media', 'prompt-media', 'admin-temp')
    and public.is_admin()
  );

create policy "storage_admin_update" on storage.objects
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "storage_admin_delete" on storage.objects
  for delete to authenticated
  using (public.is_admin());

-- --- Referentiels ---------------------------------------------------------
insert into public.roles (key, label, description) values
  ('user', 'Membre', 'Acces a la bibliotheque selon son droit.'),
  ('admin', 'Administrateur', 'Gere le catalogue, les medias et le support.'),
  ('super_admin', 'Super administrateur', 'Gere les roles et la securite.')
on conflict (key) do nothing;

insert into public.ai_providers (key, name, sort_order) values
  ('chatgpt', 'ChatGPT', 1),
  ('claude', 'Claude', 2),
  ('gemini', 'Gemini', 3)
on conflict (key) do nothing;

insert into public.products (slug, name, description, price_amount, price_currency, access_type)
values (
  'acces-a-vie',
  'RaccourcIA - Acces a vie',
  'Acces illimite a la bibliotheque de raccourcis, paiement unique.',
  2900,
  'XOF',
  'lifetime'
)
on conflict (slug) do nothing;

-- --- Configuration runtime -------------------------------------------------
insert into public.app_config (key, value, description, is_public) values
  ('mode_analyse_enabled', 'false'::jsonb,
    'Affiche le mode Analyse dans la bibliotheque. Activable sans redeploiement.', true),
  ('public_catalog_enabled', 'true'::jsonb,
    'Autorise les pages publiques partageables des raccourcis.', true),
  ('max_active_sessions', '3'::jsonb,
    'Nombre de sessions applicatives actives simultanees par compte.', false),
  ('free_prompt_limit', '5'::jsonb,
    'Repere editorial du nombre de raccourcis gratuits de demonstration.', false)
on conflict (key) do nothing;

-- --- Promotion du premier administrateur -----------------------------------
-- Le role est attribue des que le compte existe, quel que soit l'ordre
-- (compte cree avant ou apres cette migration).
create or replace function public.promote_bootstrap_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(new.email) = 'eigeingrau@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin'), (new.id, 'super_admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created_bootstrap_admin
  after insert on auth.users
  for each row execute function public.promote_bootstrap_admin();

insert into public.user_roles (user_id, role)
select u.id, r.role
from auth.users u
cross join (values ('admin'::public.app_role), ('super_admin'::public.app_role)) as r(role)
where lower(u.email) = 'eigeingrau@gmail.com'
on conflict do nothing;
