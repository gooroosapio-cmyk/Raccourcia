-- Les six controles de /api/resolve-prompt, un par un.
begin;

-- 1. Sans session : refus.
select tests_logout();
do $$
begin
  begin
    perform public.resolve_prompt('00000000-0000-0000-0000-0000000000d1', 'chatgpt');
    perform tests_assert(false, 'resolve_prompt a repondu a un visiteur.');
  exception
    when insufficient_privilege then null;  -- execute revoque pour anon
    when sqlstate '28000' then null;        -- AUTH_REQUIRED
  end;
end;
$$;
reset role;

-- 2. Session applicative revoquee : refus.
select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f3');
do $$
begin
  begin
    perform public.resolve_prompt('00000000-0000-0000-0000-0000000000d1', 'chatgpt');
    perform tests_assert(false, 'resolve_prompt a accepte une session revoquee.');
  exception when sqlstate '28000' then null;
  end;
end;
$$;
reset role;

-- 3. Membre sans droit actif : refus sur un raccourci premium.
select tests_login('00000000-0000-0000-0000-0000000000a2',
                   '00000000-0000-0000-0000-0000000000f2');
do $$
begin
  begin
    perform public.resolve_prompt('00000000-0000-0000-0000-0000000000d1', 'chatgpt');
    perform tests_assert(false, 'Un membre sans acces a obtenu un payload premium.');
  exception when sqlstate '42501' then null;
  end;
end;
$$;

-- 3 bis. Le meme membre peut copier un raccourci gratuit de demonstration.
do $$
declare v_payload text;
begin
  select payload into v_payload
  from public.resolve_prompt('00000000-0000-0000-0000-0000000000d2', 'chatgpt');
  perform tests_assert(v_payload is not null, 'Le raccourci gratuit n''est pas copiable.');
end;
$$;
reset role;

-- 4. Prompt non publie : refus, sans reveler son existence.
select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');
do $$
begin
  begin
    perform public.resolve_prompt('00000000-0000-0000-0000-0000000000d3', 'chatgpt');
    perform tests_assert(false, 'Un prompt en brouillon a ete resolu.');
  exception when sqlstate '42501' then null;
  end;
end;
$$;

-- 5. IA sans variante publiee : refus.
do $$
begin
  begin
    perform public.resolve_prompt('00000000-0000-0000-0000-0000000000d1', 'claude');
    perform tests_assert(false, 'Une IA sans variante publiee a renvoye un payload.');
  exception when sqlstate '42501' then null;
  end;
end;
$$;

-- 6. Cas nominal : un seul payload, et l'evenement de copie est journalise.
do $$
declare v_payload text; v_events integer;
begin
  select payload into v_payload
  from public.resolve_prompt('00000000-0000-0000-0000-0000000000d1', 'chatgpt');
  perform tests_assert(v_payload like '[RaccourcIA%', 'Payload inattendu.');

  select count(*) into v_events from public.copy_events
  where user_id = '00000000-0000-0000-0000-0000000000a1'
    and prompt_id = '00000000-0000-0000-0000-0000000000d1';
  perform tests_assert(v_events >= 1, 'La copie n''a pas ete journalisee.');
end;
$$;
reset role;

rollback;
