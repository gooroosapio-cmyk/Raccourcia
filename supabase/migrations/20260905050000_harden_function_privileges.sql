-- =====================================================================
-- RaccourcIA - 10. Durcissement des privileges de fonctions
--
-- Postgres accorde EXECUTE a PUBLIC par defaut : toute fonction de
-- public/ est donc exposee par PostgREST sur /rest/v1/rpc/. L'audit
-- Supabase a releve trois problemes reels :
--
--  1. consume_rate_limit et purge_rate_limit_counters etaient appelables
--     par n'importe qui. Un visiteur pouvait epuiser le compteur d'un
--     autre compte, ou vider toutes les fenetres et neutraliser le
--     rate limiting.
--  2. has_active_entitlement(uuid) acceptait un identifiant arbitraire :
--     un membre pouvait sonder l'acces d'un autre compte.
--  3. Les fonctions de trigger etaient exposees comme RPC sans raison.
--
-- Les helpers appeles depuis les policies RLS (is_admin, has_role,
-- current_app_session_is_active...) doivent, eux, rester executables :
-- une policy est evaluee avec les droits de l'appelant.
-- =====================================================================

-- Un search_path vide evite qu'un objet cree par un role malveillant
-- soit resolu a la place de celui attendu.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- --- Fonctions de trigger : jamais appelables directement -----------------
-- Postgres ne verifie pas EXECUTE au declenchement d'un trigger : revoquer
-- ici n'empeche donc aucun trigger de fonctionner.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.promote_bootstrap_admin() from public, anon, authenticated;
revoke all on function public.categories_check_hierarchy() from public, anon, authenticated;
revoke all on function public.categories_refresh_visibility() from public, anon, authenticated;
revoke all on function public.categories_cascade_visibility() from public, anon, authenticated;
revoke all on function public.prompts_refresh_search_text() from public, anon, authenticated;

-- --- Rate limiting : usage serveur uniquement ----------------------------
revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.purge_rate_limit_counters() from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.purge_rate_limit_counters() to service_role;

-- --- Droit d'acces : on ne sonde pas le compte des autres -----------------
-- La fonction reste utilisable par les policies et par resolve_prompt, mais
-- un identifiant etranger ne renvoie plus rien d'exploitable.
create or replace function public.has_active_entitlement(p_user_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.entitlements e
    where e.user_id = coalesce(p_user_id, (select auth.uid()))
      and e.status = 'active'
      and e.starts_at <= now()
      and (e.expires_at is null or e.expires_at > now())
  )
  -- Seul son propre acces, ou celui que consulte un administrateur.
  and (
    p_user_id is null
    or p_user_id = (select auth.uid())
    or public.is_admin()
  );
$$;
