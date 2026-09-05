-- Les regles d'administration doivent tenir en base, pas seulement dans
-- l'interface : un formulaire contourne ne doit rien pouvoir forcer.
begin;

-- --- Un membre ne peut declencher aucune operation d'administration -------
select tests_login('00000000-0000-0000-0000-0000000000a2',
                   '00000000-0000-0000-0000-0000000000f2');
do $$
begin
  begin
    perform public.admin_publish_prompt('00000000-0000-0000-0000-0000000000d3');
    perform tests_assert(false, 'Un membre a publie un raccourci.');
  exception when sqlstate '42501' then null;
  end;

  begin
    perform public.admin_set_category_status('00000000-0000-0000-0000-0000000000c1', 'draft');
    perform tests_assert(false, 'Un membre a desactive une categorie.');
  exception when sqlstate '42501' then null;
  end;

  begin
    perform public.admin_set_access('00000000-0000-0000-0000-0000000000a2', true);
    perform tests_assert(false, 'Un membre s''est accorde un acces a vie.');
  exception when sqlstate '42501' then null;
  end;
end;
$$;
reset role;

-- --- Publication : un contenu incomplet est refuse -----------------------
select tests_login('00000000-0000-0000-0000-0000000000a3');
do $$
declare v_prompt_id uuid;
begin
  insert into public.prompts (command, name, slug, mode, short_description, status)
  values ('/testincomplet', 'Incomplet', 'testincomplet', 'texte',
          'Sans categorie ni version.', 'draft')
  returning id into v_prompt_id;

  -- Sans categorie : refus.
  begin
    perform public.admin_publish_prompt(v_prompt_id);
    perform tests_assert(false, 'Un raccourci sans categorie a ete publie.');
  exception when sqlstate '23514' then null;
  end;

  update public.prompts set category_id = '00000000-0000-0000-0000-0000000000c3'
  where id = v_prompt_id;

  -- Avec categorie mais sans version courante : refus.
  begin
    perform public.admin_publish_prompt(v_prompt_id);
    perform tests_assert(false, 'Un raccourci sans version copiable a ete publie.');
  exception when sqlstate '23514' then null;
  end;

  perform tests_assert(
    (select status from public.prompts where id = v_prompt_id) = 'draft',
    'Le raccourci refuse doit rester en brouillon.');
end;
$$;
reset role;

-- --- Versionnement : l'ancienne version est conservee --------------------
select tests_login('00000000-0000-0000-0000-0000000000a3');
do $$
declare
  v_variant_id uuid;
  v_first uuid;
  v_second uuid;
  v_total integer;
begin
  select variant_id into v_variant_id
  from public.admin_get_prompt_versions('00000000-0000-0000-0000-0000000000d1')
  where provider_key = 'chatgpt';

  -- La table reste fermee meme a l'admin : on lit par la fonction dediee.
  select version_id into v_first
  from public.admin_get_prompt_versions('00000000-0000-0000-0000-0000000000d1')
  where provider_key = 'chatgpt';

  v_second := public.admin_new_prompt_version(v_variant_id, 'Nouveau payload de test.');

  perform tests_assert(v_second is not null, 'La nouvelle version n''a pas ete creee.');

  perform tests_assert(
    (select payload from public.admin_get_prompt_versions('00000000-0000-0000-0000-0000000000d1')
     where provider_key = 'chatgpt') = 'Nouveau payload de test.',
    'Le nouveau payload n''a pas ete enregistre.');

  -- Un payload vide est refuse.
  begin
    perform public.admin_new_prompt_version(v_variant_id, '   ');
    perform tests_assert(false, 'Un payload vide a ete accepte.');
  exception when sqlstate '23514' then null;
  end;

  perform set_config('tests.first_version', v_first::text, true);
  perform set_config('tests.variant', v_variant_id::text, true);
end;
$$;
reset role;

-- L'historique se verifie hors role client : la table n'est lisible par
-- aucun d'eux, ce qui est precisement la garantie recherchee.
do $$
declare
  v_first uuid := current_setting('tests.first_version')::uuid;
  v_variant uuid := current_setting('tests.variant')::uuid;
begin
  perform tests_assert(
    (select status from public.prompt_versions where id = v_first) = 'retired',
    'L''ancienne version devrait passer en retired.');
  perform tests_assert(
    not (select is_current from public.prompt_versions where id = v_first),
    'L''ancienne version ne doit plus etre courante.');
  perform tests_assert(
    (select count(*) from public.prompt_versions where variant_id = v_variant) >= 2,
    'L''historique des versions doit etre conserve.');
  perform tests_assert(
    (select count(*) from public.prompt_versions
     where variant_id = v_variant and is_current) = 1,
    'Il ne doit exister qu''une seule version courante.');
end;
$$;

-- --- Desactivation de categorie et acces : traces dans l'audit ------------
select tests_login('00000000-0000-0000-0000-0000000000a3');
do $$
declare v_logs integer;
begin
  perform public.admin_set_category_status('00000000-0000-0000-0000-0000000000c1', 'draft');
  perform tests_assert(
    not (select is_visible from public.categories
         where id = '00000000-0000-0000-0000-0000000000c2'),
    'La desactivation doit masquer la sous-categorie.');

  perform public.admin_set_access('00000000-0000-0000-0000-0000000000a2', true);
  perform tests_assert(public.has_active_entitlement('00000000-0000-0000-0000-0000000000a2'),
    'L''admin doit pouvoir accorder un acces.');

  perform public.admin_set_access('00000000-0000-0000-0000-0000000000a2', false, 'remboursement');
  perform tests_assert(not public.has_active_entitlement('00000000-0000-0000-0000-0000000000a2'),
    'L''admin doit pouvoir retirer un acces.');

  select count(*) into v_logs from public.admin_audit_logs
  where action in ('categorie.statut', 'acces.accorde', 'acces.retire');
  perform tests_assert(v_logs >= 3,
    format('Chaque action sensible doit laisser une trace (%s trouvees).', v_logs));
end;
$$;
reset role;

-- Meme un administrateur ne lit pas la table de payloads en direct.
select tests_login('00000000-0000-0000-0000-0000000000a3');
do $$
begin
  begin
    perform count(*) from public.prompt_versions;
    perform tests_assert(false, 'Un admin a lu prompt_versions en acces direct.');
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

rollback;
