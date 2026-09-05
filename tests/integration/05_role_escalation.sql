-- Un admin simple ne doit pas pouvoir s'attribuer super_admin,
-- ni un membre s'attribuer un role (Doc Technique V1, 11.3).
begin;

select tests_login('00000000-0000-0000-0000-0000000000a3');
do $$
begin
  begin
    insert into public.user_roles (user_id, role)
    values ('00000000-0000-0000-0000-0000000000a3', 'super_admin');
    perform tests_assert(false, 'Un admin s''est attribue le role super_admin.');
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
    insert into public.user_roles (user_id, role)
    values ('00000000-0000-0000-0000-0000000000a2', 'admin');
    perform tests_assert(false, 'Un membre s''est attribue le role admin.');
  exception when insufficient_privilege then null;
  end;

  -- Un membre ne doit pas non plus pouvoir publier un prompt.
  begin
    update public.prompts set status = 'published'
    where id = '00000000-0000-0000-0000-0000000000d3';
    perform tests_assert(
      (select status from public.prompts where id = '00000000-0000-0000-0000-0000000000d3')
        is distinct from 'published',
      'Un membre a publie un prompt.');
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Un super_admin, lui, peut gerer les roles.
select tests_login('00000000-0000-0000-0000-0000000000a4');
do $$
begin
  insert into public.user_roles (user_id, role)
  values ('00000000-0000-0000-0000-0000000000a2', 'admin');
  perform tests_assert(
    exists (select 1 from public.user_roles
            where user_id = '00000000-0000-0000-0000-0000000000a2' and role = 'admin'),
    'Un super_admin doit pouvoir attribuer un role.');
end;
$$;
reset role;

rollback;
