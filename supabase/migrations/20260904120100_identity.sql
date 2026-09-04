-- =====================================================================
-- RaccourcIA - 02. Identite, roles et sessions applicatives
-- Supabase Auth conserve les credentials ; ces tables ne portent que
-- les donnees applicatives (Blueprint Backend V1, 4).
-- =====================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email extensions.citext not null,
  display_name text,
  avatar_url text,
  account_status public.account_status not null default 'active',
  -- Provider IA prefere, duplique cote client pour une reaction instantanee.
  preferred_provider_key text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Referentiel des roles : une table plutot qu'un booleen is_admin, afin de
-- pouvoir ajouter des privileges sans migration structurelle.
create table public.roles (
  key public.app_role primary key,
  label text not null,
  description text
);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null references public.roles (key),
  granted_by uuid references auth.users (id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index user_roles_user_idx on public.user_roles (user_id);

-- Sessions applicatives : support de la limite souple d'appareils.
-- On limite les sessions, pas les appareils par empreinte (Doc Technique, 8.3).
create table public.app_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Claim `session_id` du JWT Supabase.
  auth_session_id uuid not null unique,
  device_label text,
  status public.session_status not null default 'active',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id)
);

create index app_sessions_user_status_idx on public.app_sessions (user_id, status);

-- Cree le profil applicatif des la creation du compte Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
