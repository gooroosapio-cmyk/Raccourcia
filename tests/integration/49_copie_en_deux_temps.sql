-- =====================================================================
-- La copie en deux temps : lire sans ecrire, enregistrer apres succes
--
-- Ce que ce fichier verrouille :
--
--   * lire le texte n'inscrit rien : ni copie, ni recent ;
--   * l'enregistrement inscrit une copie, et une seule pour un double
--     toucher ;
--   * l'enregistrement refait les controles d'acces : un membre sans acces
--     ne compte pas une commande reservee, un visiteur ne compte que les
--     commandes offertes ;
--   * une version d'une autre commande ne s'enregistre pas ;
--   * une IA inconnue ne provoque plus de refus.
-- =====================================================================
begin;

-- La version courante de d1, lue en proprietaire : `prompt_versions` est
-- fermee aux clients, et c'est tres bien ainsi.
select set_config('tests.version_d1', (
  select pv.id::text
  from public.prompt_versions pv join public.prompt_variants v on v.id = pv.variant_id
  where v.prompt_id = '00000000-0000-0000-0000-0000000000d1' and pv.is_current limit 1), true);

select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');
do $$
declare v_version uuid; v_avant integer; v_payload text;
begin
  select count(*) into v_avant from public.copy_events;

  select version_id, payload into v_version, v_payload
  from public.lire_prompt('00000000-0000-0000-0000-0000000000d1', null);
  perform tests_assert(v_payload is not null, 'lire_prompt ne rend rien a un membre actif.');

  perform public.lire_prompt('00000000-0000-0000-0000-0000000000d1', 'mistral');
  perform tests_assert((select count(*) from public.copy_events) = v_avant,
    'Lire le texte a inscrit une copie.');

  perform tests_assert(
    public.enregistrer_copie('00000000-0000-0000-0000-0000000000d1', v_version, null, 'detail'),
    'La premiere copie n''a pas ete inscrite.');
  perform tests_assert(
    not public.enregistrer_copie('00000000-0000-0000-0000-0000000000d1', v_version, null, 'detail'),
    'Un double toucher a inscrit deux copies.');
  perform tests_assert((select count(*) from public.copy_events) = v_avant + 1,
    'Le journal ne porte pas exactement une copie de plus.');
  perform tests_assert(exists (
      select 1 from public.recent_items
      where user_id = '00000000-0000-0000-0000-0000000000a1'
        and prompt_id = '00000000-0000-0000-0000-0000000000d1'
        and last_copied_at is not null),
    'La copie n''apparait pas dans les recents.');

  -- Une version d'une autre commande.
  begin
    perform public.enregistrer_copie('00000000-0000-0000-0000-0000000000d2', v_version, null, 'detail');
    perform tests_assert(false, 'Une copie a ete attribuee a une autre commande.');
  exception when sqlstate '42501' then null;
  end;
end $$;
reset role;

-- Un membre sans acces ne compte pas une commande reservee.
select tests_login('00000000-0000-0000-0000-0000000000a2',
                   '00000000-0000-0000-0000-0000000000f2');
do $$
declare v_version uuid := current_setting('tests.version_d1')::uuid;
begin
  begin
    perform public.lire_prompt('00000000-0000-0000-0000-0000000000d1', null);
    perform tests_assert(false, 'Un membre sans acces lit une commande reservee.');
  exception when sqlstate '42501' then null;
  end;
  begin
    perform public.enregistrer_copie('00000000-0000-0000-0000-0000000000d1', v_version, null, 'detail');
    perform tests_assert(false, 'Un membre sans acces enregistre une copie reservee.');
  exception when sqlstate '42501' then null;
  end;
end $$;
reset role;

-- Un visiteur : les commandes offertes seulement.
select tests_logout();
do $$
declare v_version uuid;
begin
  select version_id into v_version
  from public.lire_prompt_offert('00000000-0000-0000-0000-0000000000d2', null);
  perform tests_assert(v_version is not null, 'Un visiteur ne lit pas une commande offerte.');
  perform tests_assert(
    public.enregistrer_copie('00000000-0000-0000-0000-0000000000d2', v_version, null, 'detail'),
    'La copie d''un visiteur n''a pas ete inscrite.');

  begin
    perform public.lire_prompt_offert('00000000-0000-0000-0000-0000000000d1', null);
    perform tests_assert(false, 'Un visiteur lit une commande reservee.');
  exception when sqlstate '42501' then null;
  end;
  begin
    perform public.lire_prompt('00000000-0000-0000-0000-0000000000d2', null);
    perform tests_assert(false, 'Un visiteur passe par la porte des membres.');
  exception when sqlstate '28000' or sqlstate '42501' then null;
  end;
end $$;
reset role;

rollback;
