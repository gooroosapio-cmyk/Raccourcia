-- Les fonctions internes ne doivent pas etre appelables depuis le client.
-- Postgres expose EXECUTE a PUBLIC par defaut : chaque fonction de public/
-- devient sinon un endpoint /rest/v1/rpc/.
begin;

-- Le rate limiting ne doit pas pouvoir etre epuise ni vide par un visiteur
-- ou par un membre : ce serait desactiver la protection elle-meme.
select tests_logout();
do $$
begin
  begin
    perform public.consume_rate_limit('login', 'victime', 10, 900);
    perform tests_assert(false, 'Un visiteur peut consommer le quota d''un autre.');
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.purge_rate_limit_counters();
    perform tests_assert(false, 'Un visiteur peut vider les compteurs de rate limit.');
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select tests_login('00000000-0000-0000-0000-0000000000a2',
                   '00000000-0000-0000-0000-0000000000f2');
do $$
begin
  begin
    perform public.purge_rate_limit_counters();
    perform tests_assert(false, 'Un membre peut vider les compteurs de rate limit.');
  exception when insufficient_privilege then null;
  end;

  -- Un membre ne doit pas pouvoir sonder l'acces d'un autre compte.
  perform tests_assert(
    not public.has_active_entitlement('00000000-0000-0000-0000-0000000000a1'),
    'Un membre peut verifier le droit d''acces d''un autre compte.');

  -- Il voit bien son propre etat (ici : aucun droit).
  perform tests_assert(not public.has_active_entitlement(),
    'Le membre sans acces devrait etre signale comme tel.');
end;
$$;
reset role;

-- Le membre avec droit voit bien le sien.
select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');
do $$
begin
  perform tests_assert(public.has_active_entitlement(),
    'Le membre actif devrait avoir un acces reconnu.');
end;
$$;
reset role;

-- Un administrateur garde la visibilite necessaire au support.
select tests_login('00000000-0000-0000-0000-0000000000a3');
do $$
begin
  perform tests_assert(
    public.has_active_entitlement('00000000-0000-0000-0000-0000000000a1'),
    'Un admin doit pouvoir verifier l''acces d''un compte pour le support.');
end;
$$;
reset role;

-- Les fonctions de trigger ne sont pas des points d'entree.
select tests_logout();
do $$
begin
  begin
    perform public.promote_bootstrap_admin();
    perform tests_assert(false, 'La fonction de promotion admin est appelable.');
  exception when others then null;
  end;
end;
$$;
reset role;

rollback;
