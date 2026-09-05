-- =====================================================================
-- RaccourcIA - 16. Privileges de base des roles clients
--
-- Les migrations precedentes ont ete ecrites en supposant la base de
-- privileges qu'un projet Supabase accorde d'ordinaire aux roles `anon`,
-- `authenticated` et `service_role`. Ce projet ne l'avait pas : seul le
-- proprietaire disposait du moindre DML, les trois roles ne portant que
-- `REFERENCES, TRIGGER, TRUNCATE`.
--
-- Consequence observee en production : la RLS n'etait jamais atteinte,
-- puisque la couche `GRANT` refusait d'abord. Le catalogue, l'espace
-- membre et l'administration echouaient a la lecture, et le webhook
-- Chariow ne pouvait pas journaliser (`journalisation_impossible`).
-- Seules les fonctions `SECURITY DEFINER`, qui s'executent avec les droits
-- du proprietaire, continuaient de fonctionner.
--
-- Cette migration retablit cette base, puis reapplique par-dessus les
-- durcissements deja decides. L'ordre compte : les revocations viennent
-- apres l'octroi general, sans quoi elles seraient annulees.
-- =====================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Base : la RLS reste la couche qui filtre reellement les lignes. Un role
-- client sans privilege SQL ne se heurte jamais a ses policies.
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

-- Toute table creee plus tard doit heriter de la meme base, sinon le
-- probleme se reproduit silencieusement a la prochaine migration.
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

-- --- Durcissements reappliques -----------------------------------------
-- Identiques a ceux de `..._rls.sql`, rejoues ici parce que l'octroi
-- general ci-dessus vient de les ecraser.

-- Le payload premium ne sort que par `resolve_prompt`.
revoke all on table public.prompt_versions from anon;
revoke select, insert, update, delete on table public.prompt_versions from authenticated;
grant select, insert, update, delete on table public.prompt_versions to service_role;

-- Aucune policy : refus total volontaire, ecriture par fonction
-- SECURITY DEFINER ou service_role uniquement.
revoke all on table public.rate_limit_counters from anon, authenticated;
