-- Scenario obligatoire : le meme evenement Chariow rejoue 2, 5 ou 20 fois
-- ne doit produire qu'un seul achat et un seul droit a vie.
begin;

do $$
declare
  v_product_id uuid;
  v_user_id uuid := '00000000-0000-0000-0000-0000000000a2';
  v_purchase_id uuid;
  v_events integer;
  v_purchases integer;
  v_entitlements integer;
begin
  select id into v_product_id from public.products where slug = 'acces-a-vie';

  -- 20 receptions du meme evenement.
  for i in 1..20 loop
    insert into public.webhook_events (source, external_event_id, event_type, signature_valid, payload)
    values ('chariow', 'evt_test_123', 'sale.completed', true, '{"order_id":"ord_test_1"}'::jsonb)
    on conflict (source, external_event_id) do nothing;

    insert into public.purchases (product_id, user_id, external_order_id, status, purchased_at)
    values (v_product_id, v_user_id, 'ord_test_1', 'completed', now())
    on conflict (external_order_id) do update set status = 'completed'
    returning id into v_purchase_id;

    if v_purchase_id is null then
      select id into v_purchase_id from public.purchases where external_order_id = 'ord_test_1';
    end if;

    insert into public.entitlements (user_id, product_id, access_type, status, source_purchase_id)
    values (v_user_id, v_product_id, 'lifetime', 'active', v_purchase_id)
    on conflict (user_id, product_id) do update
      set status = 'active', revoked_reason = null;
  end loop;

  select count(*) into v_events from public.webhook_events where external_event_id = 'evt_test_123';
  select count(*) into v_purchases from public.purchases where external_order_id = 'ord_test_1';
  select count(*) into v_entitlements from public.entitlements
    where user_id = v_user_id and product_id = v_product_id;

  perform tests_assert(v_events = 1, format('20 webhooks ont cree %s evenements.', v_events));
  perform tests_assert(v_purchases = 1, format('20 webhooks ont cree %s achats.', v_purchases));
  perform tests_assert(v_entitlements = 1,
    format('20 webhooks ont cree %s droits a vie.', v_entitlements));

  -- Remboursement : l'acces est retire, le compte et l'achat sont conserves.
  update public.purchases set status = 'refunded', refunded_at = now()
  where external_order_id = 'ord_test_1';
  update public.entitlements set status = 'revoked', revoked_reason = 'refund'
  where user_id = v_user_id and product_id = v_product_id;

  perform tests_assert(not public.has_active_entitlement(v_user_id),
    'Un remboursement doit retirer l''acces.');
  perform tests_assert(
    (select count(*) from public.purchases where external_order_id = 'ord_test_1') = 1,
    'Le remboursement ne doit pas supprimer l''achat.');

  -- Restauration par un admin.
  update public.entitlements set status = 'active', revoked_reason = null
  where user_id = v_user_id and product_id = v_product_id;
  perform tests_assert(public.has_active_entitlement(v_user_id),
    'Un admin doit pouvoir restaurer l''acces.');
end;
$$;

rollback;
