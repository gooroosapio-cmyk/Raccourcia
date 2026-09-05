-- Scenario obligatoire (Doc Technique V1, 21.2) :
-- un visiteur ou un membre ne doit jamais pouvoir lire prompt_versions.
begin;

-- Visiteur non authentifie.
select tests_logout();
do $$
declare v_count integer;
begin
  begin
    select count(*) into v_count from public.prompt_versions;
    -- Si la lecture passe, elle doit au moins ne rien renvoyer.
    perform tests_assert(v_count = 0, 'Un visiteur a lu des lignes de prompt_versions.');
  exception when insufficient_privilege then
    null; -- Refus au niveau du privilege SQL : resultat attendu.
  end;
end;
$$;
reset role;

-- Membre authentifie avec droit actif : le payload reste inaccessible en bulk.
select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');
do $$
declare v_count integer;
begin
  begin
    select count(*) into v_count from public.prompt_versions;
    perform tests_assert(v_count = 0,
      'Un membre a lu des lignes de prompt_versions en acces direct.');
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

-- Un membre ne voit pas les achats des autres comptes.
select tests_login('00000000-0000-0000-0000-0000000000a2',
                   '00000000-0000-0000-0000-0000000000f2');
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.entitlements;
  perform tests_assert(v_count = 0, 'Un membre a lu les droits d''un autre compte.');
end;
$$;
reset role;

rollback;
