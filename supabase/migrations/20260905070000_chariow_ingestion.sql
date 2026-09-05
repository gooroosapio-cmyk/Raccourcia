-- =====================================================================
-- RaccourcIA - 12. Ingestion des evenements Chariow (lot 7)
--
-- Chariow envoie la vente (successful.sale) et la licence (license.issued)
-- comme deux notifications independantes, sans garantir leur ordre
-- d'arrivee : mesure sur trois achats reels, l'ecart va de -3 ms a +1.3 s,
-- et la licence est arrivee avant la vente une fois sur trois. Le
-- traitement doit donc etre commutatif dans les deux sens plutot que de
-- supposer que la vente precede toujours la licence.
-- =====================================================================

-- Licence recue sans vente correspondante encore connue (ou en avance sur
-- elle) : elle est scellee ici, en attente d'adoption par une vente sur le
-- meme email. Conservee meme une fois adoptee, pour l'audit et le support.
create table public.pending_licenses (
  id uuid primary key default extensions.gen_random_uuid(),
  chariow_license_id text not null unique,
  customer_email extensions.citext not null,
  chariow_customer_id text,
  chariow_product_id text,
  -- Jamais la licence en clair : seule son empreinte HMAC est stockee,
  -- calculee cote application avec le meme pepper que purchases (lib/access/license.ts).
  license_fingerprint text not null,
  issued_at timestamptz not null,
  adopted_purchase_id uuid references public.purchases (id),
  adopted_at timestamptz,
  source_event_id uuid references public.webhook_events (id),
  created_at timestamptz not null default now()
);

create index pending_licenses_unclaimed_idx on public.pending_licenses (customer_email)
  where adopted_at is null;

alter table public.pending_licenses enable row level security;

-- Meme regle que webhook_events : lecture technique reservee aux admins,
-- aucune ecriture client. L'ingestion ecrit via service_role.
create policy "pending_licenses_admin_read" on public.pending_licenses
  for select to authenticated
  using (public.is_admin());

-- --- Ingestion d'une vente ---------------------------------------------
-- Cree ou met a jour la copie metier de la vente (idempotent via la
-- contrainte unique sur external_order_id), puis adopte toute licence deja
-- recue pour le meme email si le paiement est complet.
create or replace function public.process_chariow_sale(
  p_payload jsonb,
  p_source_event_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email extensions.citext;
  v_product_id uuid;
  v_purchase_id uuid;
  v_status public.purchase_status;
  v_pending public.pending_licenses%rowtype;
begin
  v_email := lower(trim(both from (p_payload -> 'customer' ->> 'email')));
  if v_email is null or v_email = '' then
    raise exception 'CHARIOW_EMAIL_MANQUANT';
  end if;

  -- Serialise avec le traitement d'une licence pour le meme client : les
  -- deux notifications peuvent arriver en parallele, jamais dans un ordre fiable.
  perform pg_advisory_xact_lock(hashtext(v_email::text));

  v_status := case p_payload -> 'sale' ->> 'status'
    when 'completed' then 'completed'::public.purchase_status
    when 'refunded' then 'refunded'::public.purchase_status
    when 'cancelled' then 'cancelled'::public.purchase_status
    else 'pending'::public.purchase_status
  end;

  -- Le produit peut ne pas encore etre rapproche (chariow_product_id non
  -- renseigne cote admin) : l'achat est quand meme journalise, sans produit.
  select id into v_product_id
  from public.products
  where chariow_product_id = (p_payload -> 'product' ->> 'id');

  insert into public.purchases (
    product_id, external_order_id, customer_email, chariow_customer_id,
    amount, currency, status, purchased_at, source_event_id
  )
  values (
    v_product_id,
    p_payload -> 'sale' ->> 'id',
    v_email,
    p_payload -> 'customer' ->> 'id',
    nullif(p_payload -> 'sale' -> 'amount' ->> 'value', '')::integer,
    p_payload -> 'sale' -> 'amount' ->> 'currency',
    v_status,
    coalesce(
      (p_payload -> 'sale' ->> 'completed_at')::timestamptz,
      (p_payload -> 'sale' ->> 'created_at')::timestamptz
    ),
    p_source_event_id
  )
  on conflict (external_order_id) do update
    set status = excluded.status,
        product_id = coalesce(public.purchases.product_id, excluded.product_id),
        source_event_id = excluded.source_event_id
  returning id into v_purchase_id;

  if v_status = 'completed' then
    select * into v_pending
    from public.pending_licenses
    where customer_email = v_email
      and adopted_at is null
    order by issued_at desc
    limit 1;

    if found then
      update public.purchases
        set license_fingerprint = v_pending.license_fingerprint
        where id = v_purchase_id
          and license_fingerprint is null;

      update public.pending_licenses
        set adopted_purchase_id = v_purchase_id,
            adopted_at = now()
        where id = v_pending.id;
    end if;
  end if;

  return v_purchase_id;
end;
$$;

-- --- Ingestion d'une licence ---------------------------------------------
-- Rattache la licence a une vente complete deja recue pour le meme email
-- (cas normal), ou la scelle en attente si la vente n'est pas encore arrivee
-- (cas mesure une fois sur trois). L'empreinte est calculee cote application :
-- la fonction ne recoit jamais la licence en clair.
create or replace function public.process_chariow_license(
  p_payload jsonb,
  p_source_event_id uuid,
  p_license_fingerprint text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email extensions.citext;
  v_license_id text;
  v_purchase_id uuid;
begin
  v_email := lower(trim(both from (p_payload -> 'customer' ->> 'email')));
  v_license_id := p_payload -> 'license' ->> 'id';
  if v_email is null or v_email = '' or v_license_id is null then
    raise exception 'CHARIOW_LICENCE_INCOMPLETE';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_email::text));

  select id into v_purchase_id
  from public.purchases
  where customer_email = v_email
    and status = 'completed'
    and license_fingerprint is null
  order by purchased_at desc nulls last, created_at desc
  limit 1;

  if v_purchase_id is not null then
    update public.purchases
      set license_fingerprint = p_license_fingerprint
      where id = v_purchase_id;
  end if;

  insert into public.pending_licenses (
    chariow_license_id, customer_email, chariow_customer_id, chariow_product_id,
    license_fingerprint, issued_at, adopted_purchase_id, adopted_at, source_event_id
  )
  values (
    v_license_id,
    v_email,
    p_payload -> 'customer' ->> 'id',
    p_payload -> 'product' ->> 'id',
    p_license_fingerprint,
    coalesce((p_payload -> 'license' ->> 'created_at')::timestamptz, now()),
    v_purchase_id,
    case when v_purchase_id is not null then now() end,
    p_source_event_id
  )
  on conflict (chariow_license_id) do nothing;
end;
$$;

revoke all on function public.process_chariow_sale(jsonb, uuid) from public, anon, authenticated;
revoke all on function public.process_chariow_license(jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.process_chariow_sale(jsonb, uuid) to service_role;
grant execute on function public.process_chariow_license(jsonb, uuid, text) to service_role;
