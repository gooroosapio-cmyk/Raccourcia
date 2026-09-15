-- Aucune table de `public` ne reste ouverte par inadvertance.
--
-- La migration 20260905110000 pose `alter default privileges` : toute table
-- creee ensuite dans `public` nait avec un SELECT pour `anon` et un
-- INSERT/UPDATE/DELETE pour `authenticated`. C'est le bon defaut pour les
-- tables du catalogue, qui referment ensuite par RLS — et un piege pour
-- tout le reste.
--
-- Une table de sauvegarde creee par un `create table as` dans un seed ne
-- definit aucune policy : sans RLS, elle herite des droits et ne referme
-- rien. C'est arrive une fois, avec `prompts_avant_image_v6`. Ce controle
-- est la pour que cela n'arrive pas deux fois.
begin;

do $$
declare
  v_ouvertes text;
  v_sans_policy text;
begin
  -- --- RLS partout ------------------------------------------------------

  select string_agg(c.relname, ', ' order by c.relname) into v_ouvertes
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

  perform tests_assert(v_ouvertes is null,
    format('Tables sans RLS : %s.', v_ouvertes));

  -- --- Une table sans policy ne doit rien accorder au navigateur --------
  --
  -- RLS active sans policy refuse deja tout le monde sauf le proprietaire et
  -- les fonctions SECURITY DEFINER. Mais laisser les droits en place rend le
  -- garde-fou dependant du seul RLS : deux verrous valent mieux qu'un sur
  -- une table qui porte un retour arriere.

  select string_agg(c.relname, ', ' order by c.relname) into v_sans_policy
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and not exists (select 1 from pg_policies p
                    where p.schemaname = 'public' and p.tablename = c.relname)
    and exists (select 1 from information_schema.role_table_grants g
                where g.table_schema = 'public' and g.table_name = c.relname
                  and g.grantee in ('anon', 'authenticated'))
    -- `rate_limit_counters` n'a pas de policy et n'en veut pas : elle ne se
    -- lit que par `consume_rate_limit`, en SECURITY DEFINER.
    and c.relname <> 'rate_limit_counters';

  perform tests_assert(v_sans_policy is null,
    format('Tables sans policy mais accessibles au navigateur : %s.', v_sans_policy));
end $$;

rollback;
