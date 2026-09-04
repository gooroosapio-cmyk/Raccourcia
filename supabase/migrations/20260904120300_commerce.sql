-- =====================================================================
-- RaccourcIA - 04. Commerce : produits, achats, droits, webhooks
-- Chariow etablit la preuve commerciale ; Supabase la transforme en droit
-- applicatif (Doc Technique V1, 9).
-- =====================================================================

create table public.products (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  chariow_product_id text unique,
  price_amount integer,
  price_currency text default 'XOF',
  access_type public.access_type not null default 'lifetime',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Journal idempotent des evenements externes. La contrainte unique sur
-- external_event_id rend l'idempotence garantie PAR LA BASE, pas par le code
-- (Doc Technique V1, 9.2).
create table public.webhook_events (
  id uuid primary key default extensions.gen_random_uuid(),
  source text not null default 'chariow',
  external_event_id text not null,
  event_type text,
  signature_valid boolean not null default false,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  constraint webhook_events_external_id_unique unique (source, external_event_id)
);

create index webhook_events_created_idx on public.webhook_events (created_at desc);
create index webhook_events_unprocessed_idx on public.webhook_events (processed_at)
  where processed_at is null;

-- Copie metier de la vente. user_id peut rester NULL : un achat peut
-- preceder la creation du compte, il est alors rattache via claim-access.
create table public.purchases (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid references public.products (id),
  user_id uuid references auth.users (id) on delete set null,
  external_order_id text not null,
  customer_email extensions.citext,
  chariow_customer_id text,
  -- Empreinte HMAC-SHA256 de la licence. La licence n'est JAMAIS stockee en
  -- clair (Doc Technique V1, 8.2).
  license_fingerprint text,
  amount integer,
  currency text default 'XOF',
  status public.purchase_status not null default 'pending',
  purchased_at timestamptz,
  refunded_at timestamptz,
  claimed_at timestamptz,
  source_event_id uuid references public.webhook_events (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchases_external_order_unique unique (external_order_id)
);

create index purchases_user_idx on public.purchases (user_id);
create index purchases_email_idx on public.purchases (customer_email);
create index purchases_fingerprint_idx on public.purchases (license_fingerprint);
create index purchases_status_idx on public.purchases (status);

create trigger purchases_set_updated_at
  before update on public.purchases
  for each row execute function public.set_updated_at();

-- Autorite d'acces runtime. Une seule ligne par couple (compte, produit) :
-- rejouer un webhook met a jour le statut, il n'en cree jamais un second.
create table public.entitlements (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id),
  access_type public.access_type not null default 'lifetime',
  status public.entitlement_status not null default 'active',
  source_purchase_id uuid references public.purchases (id),
  starts_at timestamptz not null default now(),
  -- NULL pour un acces a vie.
  expires_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entitlements_user_product_unique unique (user_id, product_id)
);

create index entitlements_user_status_idx on public.entitlements (user_id, status);

create trigger entitlements_set_updated_at
  before update on public.entitlements
  for each row execute function public.set_updated_at();

-- --- Helper d'acces ------------------------------------------------------
-- L'application ne demande jamais "a-t-il paye ?" mais "possede-t-il un
-- entitlement actif ?" (Blueprint Backend V1, 4.3).
create or replace function public.has_active_entitlement(p_user_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.entitlements e
    where e.user_id = coalesce(p_user_id, (select auth.uid()))
      and e.status = 'active'
      and e.starts_at <= now()
      and (e.expires_at is null or e.expires_at > now())
  );
$$;
