-- Chariow envoie la vente et la licence comme deux notifications
-- independantes, sans garantir leur ordre d'arrivee (mesure : de -3 ms a
-- +1.3 s d'ecart, un achat sur trois voit la licence arriver en premier).
-- Le traitement doit donc etre commutatif dans les deux sens, et idempotent
-- face a un rejeu de webhook.
begin;

do $$
declare
  v_sale_payload jsonb;
  v_license_payload jsonb;
  v_purchase_id uuid;
  v_count integer;
begin
  -- --- Cas 1 : la vente arrive, puis la licence -------------------------
  v_sale_payload := jsonb_build_object(
    'event', 'successful.sale',
    'sale', jsonb_build_object(
      'id', 'SALE_ORDRE_NORMAL',
      'status', 'completed',
      'amount', jsonb_build_object('value', 600, 'currency', 'XOF'),
      'created_at', '2026-09-03T14:47:14.000000Z',
      'completed_at', '2026-09-03T14:47:52.000000Z'
    ),
    'product', jsonb_build_object('id', 'prd_inconnu'),
    'customer', jsonb_build_object('id', 'cus_normal', 'email', 'Normal@Exemple.CI')
  );

  v_purchase_id := public.process_chariow_sale(v_sale_payload, null);

  perform tests_assert(v_purchase_id is not null, 'La vente aurait du creer un achat.');
  perform tests_assert(
    (select license_fingerprint from public.purchases where id = v_purchase_id) is null,
    'Aucune licence recue : l''empreinte doit rester vide.'
  );

  v_license_payload := jsonb_build_object(
    'event', 'license.issued',
    'license', jsonb_build_object('id', 'LIC_ORDRE_NORMAL', 'created_at', '2026-09-03T14:47:53Z'),
    'product', jsonb_build_object('id', 'prd_inconnu'),
    'customer', jsonb_build_object('id', 'cus_normal', 'email', 'normal@exemple.ci')
  );

  perform public.process_chariow_license(v_license_payload, null, 'fp_normal_test');

  perform tests_assert(
    (select license_fingerprint from public.purchases where id = v_purchase_id) = 'fp_normal_test',
    'La licence arrivee apres la vente doit etre rattachee a l''achat.'
  );
  perform tests_assert(
    (select adopted_purchase_id from public.pending_licenses
       where chariow_license_id = 'LIC_ORDRE_NORMAL') = v_purchase_id,
    'La licence adoptee doit pointer vers l''achat.'
  );

  -- --- Cas 2 : la licence arrive en premier (mesure : un achat sur trois) -
  v_license_payload := jsonb_build_object(
    'event', 'license.issued',
    'license', jsonb_build_object('id', 'LIC_ORDRE_INVERSE', 'created_at', '2026-09-03T14:47:53Z'),
    'product', jsonb_build_object('id', 'prd_inconnu'),
    'customer', jsonb_build_object('id', 'cus_inverse', 'email', 'inverse@exemple.ci')
  );
  perform public.process_chariow_license(v_license_payload, null, 'fp_inverse_test');

  perform tests_assert(
    (select adopted_at from public.pending_licenses
       where chariow_license_id = 'LIC_ORDRE_INVERSE') is null,
    'Sans vente connue, la licence doit rester orpheline.'
  );

  v_sale_payload := jsonb_build_object(
    'event', 'successful.sale',
    'sale', jsonb_build_object(
      'id', 'SALE_ORDRE_INVERSE',
      'status', 'completed',
      'amount', jsonb_build_object('value', 600, 'currency', 'XOF'),
      'created_at', '2026-09-03T14:47:14Z',
      'completed_at', '2026-09-03T14:47:52Z'
    ),
    'product', jsonb_build_object('id', 'prd_inconnu'),
    'customer', jsonb_build_object('id', 'cus_inverse', 'email', 'INVERSE@exemple.ci')
  );
  v_purchase_id := public.process_chariow_sale(v_sale_payload, null);

  perform tests_assert(
    (select license_fingerprint from public.purchases where id = v_purchase_id) = 'fp_inverse_test',
    'La vente arrivee apres la licence doit adopter la licence orpheline.'
  );
  perform tests_assert(
    (select adopted_at from public.pending_licenses
       where chariow_license_id = 'LIC_ORDRE_INVERSE') is not null,
    'La licence orpheline doit etre marquee adoptee.'
  );

  -- --- Rejeu : le meme webhook livre deux fois ne doit rien dupliquer -----
  perform public.process_chariow_sale(v_sale_payload, null);
  select count(*) into v_count from public.purchases where external_order_id = 'SALE_ORDRE_INVERSE';
  perform tests_assert(v_count = 1, format('Un rejeu de vente a cree %s achats.', v_count));

  perform public.process_chariow_license(v_license_payload, null, 'fp_inverse_test');
  select count(*) into v_count from public.pending_licenses
    where chariow_license_id = 'LIC_ORDRE_INVERSE';
  perform tests_assert(v_count = 1, format('Un rejeu de licence a cree %s lignes.', v_count));
end;
$$;

-- --- Ces fonctions ne sont pas des points d'entree client ------------------
select tests_login('00000000-0000-0000-0000-0000000000a2',
                   '00000000-0000-0000-0000-0000000000f2');
do $$
begin
  begin
    perform public.process_chariow_sale('{}'::jsonb, null);
    perform tests_assert(false, 'Un membre a pu appeler process_chariow_sale.');
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.process_chariow_license('{}'::jsonb, null, 'x');
    perform tests_assert(false, 'Un membre a pu appeler process_chariow_license.');
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select tests_logout();
do $$
begin
  begin
    perform public.process_chariow_sale('{}'::jsonb, null);
    perform tests_assert(false, 'Un visiteur anonyme a pu appeler process_chariow_sale.');
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

rollback;
