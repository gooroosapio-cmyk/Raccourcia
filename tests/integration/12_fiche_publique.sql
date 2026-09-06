-- Donnees de la fiche : ce qui doit sortir, et ce qui ne doit jamais sortir.
--
-- La refonte a ajoute trois colonnes lues par les cartes et les fiches
-- (`input_examples`, `output_formats`, `result_summary`) et fait reposer la
-- comparaison Avant/Apres sur `prompt_media`. Ces colonnes sont publiques par
-- construction : elles decrivent ce que la commande accepte et produit.
--
-- Le contenu complet, lui, reste hors de portee. Ce fichier verrouille les
-- deux affirmations ensemble : ouvrir la fiche ne doit pas devenir une voie
-- d'acces au payload.
begin;

do $$
declare
  v_colonne text;
begin
  -- --- Ce que la fiche doit pouvoir lire --------------------------------

  foreach v_colonne in array array['input_examples', 'output_formats', 'result_summary'] loop
    perform tests_assert(
      has_column_privilege('anon', 'public.prompts', v_colonne, 'SELECT'),
      format('anon ne peut pas lire prompts.%s : la page publique serait muette.', v_colonne));
    perform tests_assert(
      has_column_privilege('authenticated', 'public.prompts', v_colonne, 'SELECT'),
      format('authenticated ne peut pas lire prompts.%s.', v_colonne));
  end loop;

  -- La comparaison Avant/Apres vient de prompt_media. Sans lecture, toutes
  -- les cartes image retomberaient sur la vignette typographique.
  perform tests_assert(
    has_table_privilege('anon', 'public.prompt_media', 'SELECT'),
    'anon ne peut pas lire prompt_media : aucune comparaison Avant/Apres ne s afficherait.');
  perform tests_assert(
    has_table_privilege('authenticated', 'public.prompt_media', 'SELECT'),
    'authenticated ne peut pas lire prompt_media.');

  -- --- Ce qui doit rester refuse ----------------------------------------

  -- Le contenu complet ne se lit ni en anon ni en authenticated, quelle que
  -- soit la richesse de la fiche.
  perform tests_assert(
    not has_table_privilege('anon', 'public.prompt_versions', 'SELECT'),
    'anon peut lire prompt_versions : le contenu complet fuite.');
  perform tests_assert(
    not has_table_privilege('authenticated', 'public.prompt_versions', 'SELECT'),
    'authenticated peut lire prompt_versions : le contenu complet fuite.');
end $$;

-- Les listes controlees ne doivent pas accepter de valeur libre : une valeur
-- inconnue n'aurait ni icone ni libelle, et passerait en clair dans l'interface.
do $$
declare
  v_erreur boolean := false;
begin
  begin
    perform 'valeur_inconnue'::public.input_example_kind;
  exception
    when others then v_erreur := true;
  end;

  perform tests_assert(
    v_erreur,
    'input_example_kind accepte une valeur hors liste : l interface afficherait du texte brut.');
end $$;

-- Les 151 commandes publiees doivent toutes savoir dire ce qu'elles
-- produisent : une fiche sans format de sortie ne repond pas a la question
-- que l'utilisateur se pose avant de copier.
do $$
declare
  v_muettes integer;
begin
  select count(*) into v_muettes
  from public.prompts
  where status = 'published' and cardinality(output_formats) = 0;

  perform tests_assert(
    v_muettes = 0,
    format('%s commandes publiees n annoncent aucun format de sortie.', v_muettes));
end $$;

rollback;
