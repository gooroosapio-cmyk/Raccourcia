-- =====================================================================
-- RaccourcIA - 06. Usage, gouvernance et configuration runtime
-- On collecte ce qui sert au produit, au support et a la securite.
-- Jamais le contenu du presse-papiers, jamais le payload (Doc Technique, 18).
-- =====================================================================

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, prompt_id)
);

create index favorites_user_idx on public.favorites (user_id, created_at desc);

create table public.copy_events (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  variant_id uuid references public.prompt_variants (id) on delete set null,
  version_id uuid references public.prompt_versions (id) on delete set null,
  provider_key text,
  surface text,
  created_at timestamptz not null default now()
);

create index copy_events_prompt_idx on public.copy_events (prompt_id, created_at desc);
create index copy_events_user_idx on public.copy_events (user_id, created_at desc);

-- Vue "Recents" : une ligne par couple utilisateur/raccourci. Les raccourcis
-- effectivement copies priment sur les simples consultations.
create table public.recent_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  last_viewed_at timestamptz,
  last_copied_at timestamptz,
  copy_count integer not null default 0,
  primary key (user_id, prompt_id)
);

create index recent_items_user_idx on public.recent_items
  (user_id, coalesce(last_copied_at, last_viewed_at) desc);

-- --- Gouvernance ---------------------------------------------------------
create table public.admin_audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  admin_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index admin_audit_logs_entity_idx on public.admin_audit_logs (entity_type, entity_id);

create table public.security_events (
  id uuid primary key default extensions.gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users (id) on delete set null,
  -- IP hachee uniquement : aucune adresse en clair (Doc Technique, 18.2).
  ip_hash text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index security_events_type_idx on public.security_events (event_type, created_at desc);

-- --- Rate limiting en Postgres (pas de service externe en V1) -------------
create table public.rate_limit_counters (
  bucket text not null,
  subject text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket, subject, window_start)
);

create index rate_limit_window_idx on public.rate_limit_counters (window_start);

-- Incremente un compteur et indique si la limite est franchie.
create or replace function public.consume_rate_limit(
  p_bucket text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  v_count integer;
begin
  insert into public.rate_limit_counters (bucket, subject, window_start, count)
  values (p_bucket, p_subject, v_window, 1)
  on conflict (bucket, subject, window_start)
    do update set count = public.rate_limit_counters.count + 1
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

-- Purge des fenetres expirees, appelee par une tache planifiee.
create or replace function public.purge_rate_limit_counters()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.rate_limit_counters where window_start < now() - interval '1 day';
$$;

-- --- Configuration runtime ------------------------------------------------
-- Activer un mode ou changer une limite ne demande ni migration ni
-- recompilation (Doc Technique V1, 25.3).
create table public.app_config (
  key text primary key,
  value jsonb not null,
  description text,
  -- Une cle publique est lisible par le navigateur (feature flags d'affichage).
  is_public boolean not null default false,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

create trigger app_config_set_updated_at
  before update on public.app_config
  for each row execute function public.set_updated_at();
