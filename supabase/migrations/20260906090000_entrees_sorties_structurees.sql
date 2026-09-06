-- =====================================================================
-- RaccourcIA - 21. Entrees et sorties structurees
--
-- La fiche doit repondre a "que dois-je fournir ?" et "qu'est-ce que je
-- recois ?". Ces reponses vivaient jusqu'ici dans de la prose libre
-- (`expected_input`, `output_format`), impossible a afficher en tuiles et
-- impossible a filtrer.
--
-- On ajoute deux listes controlees. La prose est conservee : elle reste la
-- source de la migration de reprise et n'est pas perdue.
--
-- Le prompt complet n'est pas concerne : il reste dans prompt_versions,
-- hors de portee du client.
-- =====================================================================

-- Types d'entree proposes a l'utilisateur. Enum plutot que texte libre :
-- l'interface doit pouvoir associer une icone a chaque valeur, et un
-- libelle saisi a la main casserait cette correspondance.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'input_example_kind') then
    create type public.input_example_kind as enum (
      'photo_produit',
      'photo_lieu',
      'photo_personne',
      'capture_ecran',
      'document_pdf',
      'texte_brut',
      'tableau',
      'url',
      'brief'
    );
  end if;
end $$;

-- Formats de sortie reellement produits. "analysis" existait deja dans
-- output_type mais ne dit pas sous quelle forme le resultat arrive.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'output_format_kind') then
    create type public.output_format_kind as enum (
      'image',
      'texte',
      'pdf',
      'document',
      'presentation',
      'tableur',
      'code',
      'audio',
      'video'
    );
  end if;
end $$;

alter table public.prompts
  add column if not exists input_examples public.input_example_kind[] not null default '{}',
  add column if not exists output_formats public.output_format_kind[] not null default '{}',
  -- Promesse de resultat en une phrase, distincte de `short_description` :
  -- celle-ci decrit le raccourci, celle-la ce que l'utilisateur obtient.
  add column if not exists result_summary text;

comment on column public.prompts.input_examples is
  'Entrees acceptees, listees en tuiles sur la fiche. Vide = on retombe sur input_type.';
comment on column public.prompts.output_formats is
  'Formats reellement produits. Vide = on retombe sur output_type.';
comment on column public.prompts.result_summary is
  'Ce que l''utilisateur obtient, en une phrase. A defaut, short_description.';

-- ---------------------------------------------------------------------
-- Reprise des donnees existantes.
--
-- Les 151 raccourcis publies ont un `input_type` et un `output_type`
-- renseignes : ils suffisent a poser une premiere valeur juste, sans
-- inventer d'entree que le raccourci n'accepte pas.
-- ---------------------------------------------------------------------

update public.prompts
set input_examples = case input_type
    -- Un raccourci image part d'une photo. Laquelle depend du sujet :
    -- l'administration precisera, on ne devine pas ici.
    when 'image' then array['photo_produit', 'capture_ecran']::public.input_example_kind[]
    when 'text' then array['texte_brut', 'brief']::public.input_example_kind[]
    when 'document' then array['document_pdf', 'texte_brut']::public.input_example_kind[]
    when 'mixed' then array['texte_brut', 'capture_ecran']::public.input_example_kind[]
  end
where cardinality(input_examples) = 0;

update public.prompts
set output_formats = case output_type
    when 'image' then array['image']::public.output_format_kind[]
    when 'text' then array['texte']::public.output_format_kind[]
    -- Une analyse se lit : c'est un texte structure, pas un PDF impose.
    when 'analysis' then array['texte']::public.output_format_kind[]
  end
where cardinality(output_formats) = 0;

-- La promesse de resultat reprend `expected_output` quand il tient en une
-- phrase, sinon la description courte. Aucun texte n'est invente.
update public.prompts
set result_summary = case
    when expected_output is not null and length(expected_output) between 10 and 140
      then expected_output
    else short_description
  end
where result_summary is null;
