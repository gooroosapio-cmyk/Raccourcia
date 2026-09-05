-- =====================================================================
-- RaccourcIA - 15. Durcissement de analytics_window
--
-- `analytics_window` etait la seule fonction du schema `public` sans
-- `search_path` fige (avertissement 0011_function_search_path_mutable de
-- l'auditeur Supabase). Son `EXECUTE` n'etant accorde a personne, le risque
-- reel etait faible, mais la migration `..._harden_function_privileges.sql`
-- l'avait manquee : on ferme la derniere fenetre.
--
-- Le corps n'utilise que `least`, `greatest` et `coalesce`, qui sont des
-- constructions du langage et non des fonctions resolues via `search_path` :
-- le figer a vide ne casse aucune resolution de nom.
-- =====================================================================

create or replace function public.analytics_window(p_days integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select least(greatest(coalesce(p_days, 30), 1), 365);
$$;

-- `create or replace` conserve les privileges existants ; on reaffirme la
-- revocation pour que la migration soit exacte si elle est rejouee a neuf.
revoke all on function public.analytics_window(integer) from public, anon, authenticated;
