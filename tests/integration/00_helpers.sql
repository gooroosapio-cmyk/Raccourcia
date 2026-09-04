-- Helpers de test partages : simulent le contexte d'une requete PostgREST.
create or replace function tests_assert(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not p_condition then
    raise exception 'ASSERTION ECHOUEE: %', p_message;
  end if;
end;
$$;

-- Simule un JWT : role Postgres + claims (sub, session_id).
create or replace function tests_login(p_user_id uuid, p_session_id uuid default null)
returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_user_id::text,
      'role', 'authenticated',
      'session_id', coalesce(p_session_id::text, '')
    )::text,
    true
  );
  execute 'set local role authenticated';
end;
$$;

create or replace function tests_logout()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end;
$$;
