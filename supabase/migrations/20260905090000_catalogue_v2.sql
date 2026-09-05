-- =====================================================================
-- RaccourcIA - 14. Catalogue v2.0 : champs editoriaux complementaires
--
-- Le tableur v2.0 (250 raccourcis, audit A01-A10 au vert) apporte des
-- champs que le schema v1 ne portait pas : regle de piece jointe,
-- condition de blocage, cadrage du questionnaire, specification de
-- miniature et scenarios de test.
--
-- Aucune colonne existante n'est modifiee ni supprimee : les 151
-- raccourcis d'origine gardent leur identifiant et leur historique de
-- versions. Migration additive et idempotente.
-- =====================================================================

alter table public.prompts
  -- Exemple d'usage concret, affiche dans la fiche (« /xray sur une photo produit... »).
  add column if not exists usage_example text,
  -- Conditions d'utilisation : droits, consentement, honnetete du rendu.
  add column if not exists usage_conditions text,
  -- Entree principale attendue, telle qu'annoncee au membre ("image", "texte"...).
  -- input_type porte la version normalisee qui pilote la logique.
  add column if not exists primary_input text,
  -- Entrees acceptees, en clair : "image; texte de contexte".
  add column if not exists accepted_inputs text,
  -- Regle de piece jointe : obligatoire, recommandee ou facultative.
  add column if not exists attachment_rule text,
  -- Ce que l'IA doit faire quand la source indispensable manque.
  add column if not exists blocking_condition text,
  -- Cadrage du QCM : Conditionnel, Recommande, ou sans QCM par defaut.
  add column if not exists questionnaire_mode text,
  add column if not exists max_questions smallint,
  -- Mise en page de la miniature (avant/apres pour l'image).
  add column if not exists thumbnail_layout text,
  -- Rappel de la regle de copie : le bouton envoie le payload entier.
  add column if not exists copy_rule text,
  -- Provenance editoriale : "conserve et remappe" ou "nouveau V2".
  add column if not exists source_status text,
  -- Version du catalogue editorial et date de revision (traceabilite).
  add column if not exists catalog_version text,
  add column if not exists revised_at date,
  -- Scenarios de recette, jamais exposes au membre.
  add column if not exists test_nominal text,
  add column if not exists test_incomplete_context text,
  add column if not exists test_blocking text;

-- Le QCM porte desormais la variable visee et sa valeur par defaut : la
-- reponse alimente directement une variable du prompt, sans deviner.
comment on column public.prompt_versions.qcm is
  'Questions conditionnelles : [{question, options, variable, valeur_defaut}], 3 maximum.';

comment on column public.prompts.max_questions is
  'Plafond de questions pour ce raccourci (1 a 3). Le plafond global reste 3.';

-- Un plafond hors bornes trahirait une erreur d'import plutot qu'un choix.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'prompts_max_questions_range'
  ) then
    alter table public.prompts
      add constraint prompts_max_questions_range
      check (max_questions is null or (max_questions between 1 and 3));
  end if;
end;
$$;
