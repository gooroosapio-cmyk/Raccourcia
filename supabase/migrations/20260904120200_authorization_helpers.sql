-- =====================================================================
-- RaccourcIA - 03. Fonctions d'autorisation
-- SECURITY DEFINER + search_path vide : ces fonctions sont appelees depuis
-- les policies RLS et ne doivent pas declencher de recursion.
-- =====================================================================

create or replace function public.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = p_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('super_admin');
$$;

-- La session applicative portee par le JWT courant est-elle toujours active ?
create or replace function public.current_app_session_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_sessions s
    where s.user_id = (select auth.uid())
      and s.auth_session_id = nullif((select auth.jwt() ->> 'session_id'), '')::uuid
      and s.status = 'active'
  );
$$;
