-- Privileges de base des roles clients.
--
-- La RLS ne filtre que ce que la couche `GRANT` laisse passer. Un role sans
-- privilege SQL ne rencontre jamais ses policies : il est refuse avant. La
-- production a tourne dans cet etat — aucun DML pour `anon`, `authenticated`
-- ni `service_role` — et tout echouait sans qu'un seul scenario ne rougisse,
-- parce que le stub de test accordait ces droits par privileges par defaut.
--
-- Ce fichier verrouille les deux sens : ce qui doit etre accorde, et ce qui
-- doit rester refuse.
begin;

do $$
declare
  v_table text;
begin
  -- --- Ce qui doit etre accorde ---------------------------------------

  -- Le webhook Chariow, l'activation et l'administration ecrivent tous via
  -- service_role. Sans ces droits, l'ingestion repond journalisation_impossible.
  foreach v_table in array array[
    'webhook_events', 'purchases', 'entitlements', 'pending_licenses',
    'profiles', 'app_sessions', 'security_events', 'prompts', 'categories'
  ] loop
    perform tests_assert(
      has_table_privilege('service_role', 'public.' || v_table, 'INSERT'),
      format('service_role ne peut pas ecrire dans %s.', v_table));
    perform tests_assert(
      has_table_privilege('service_role', 'public.' || v_table, 'SELECT'),
      format('service_role ne peut pas lire %s.', v_table));
  end loop;

  -- Le catalogue cote membre lit avec le role authenticated, pas service_role.
  foreach v_table in array array['prompts', 'categories', 'prompt_variants', 'ai_providers'] loop
    perform tests_assert(
      has_table_privilege('authenticated', 'public.' || v_table, 'SELECT'),
      format('authenticated ne peut pas lire %s : le catalogue serait vide.', v_table));
  end loop;

  -- Les pages publiques lisent en anon.
  perform tests_assert(
    has_table_privilege('anon', 'public.prompts', 'SELECT'),
    'anon ne peut pas lire prompts : les pages publiques seraient vides.');

  -- --- Ce qui doit rester refuse ---------------------------------------

  -- Le payload premium ne sort que par resolve_prompt.
  perform tests_assert(
    not has_table_privilege('anon', 'public.prompt_versions', 'SELECT'),
    'anon peut lire prompt_versions : le contenu premium fuit.');
  perform tests_assert(
    not has_table_privilege('authenticated', 'public.prompt_versions', 'SELECT'),
    'authenticated peut lire prompt_versions : le contenu premium fuit.');

  -- Refus total volontaire : ecriture par fonction SECURITY DEFINER seulement.
  perform tests_assert(
    not has_table_privilege('anon', 'public.rate_limit_counters', 'SELECT'),
    'anon atteint rate_limit_counters.');
  perform tests_assert(
    not has_table_privilege('authenticated', 'public.rate_limit_counters', 'UPDATE'),
    'authenticated peut ecrire dans rate_limit_counters : le quota est neutralisable.');

  -- anon ne doit jamais ecrire, nulle part.
  perform tests_assert(
    not has_table_privilege('anon', 'public.purchases', 'INSERT'),
    'anon peut inserer un achat.');
  perform tests_assert(
    not has_table_privilege('anon', 'public.entitlements', 'INSERT'),
    'anon peut s''octroyer un droit d''acces.');
end;
$$;

rollback;
