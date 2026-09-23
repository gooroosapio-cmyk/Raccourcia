-- =====================================================================
-- Visuels V3 : la place des champs qu'une carte n'avait pas
--
-- CE QUE CETTE MIGRATION FAIT, ET CE QU'ELLE NE FAIT PAS.
--
-- Elle ouvre les colonnes. Elle ne pose aucune donnee : les 862 cartes,
-- les 12 categories, les 71 collections et les 76 tags arrivent par les
-- lots de `supabase/seed/visuels-v3`, comme tout le reste du catalogue.
-- Une migration qui porterait aussi le contenu ne serait plus rejouable
-- sans ecraser ce qu'un administrateur a change depuis.
--
-- POURQUOI TANT DE COLONNES D'UN COUP. Le catalogue V3 des Visuels
-- apporte trois choses que la base ne savait pas ranger :
--
--   1. Le FORMULAIRE de personnalisation. Jusqu'ici une commande
--      declarait des variables libres (`required_variables`) et l'ecran
--      devinait le reste : libelle, exemple, longueur maximale, quoi
--      faire d'un champ laisse vide. Deviner marchait tant que les
--      cartes se ressemblaient. `personnalisation` porte desormais le
--      contrat complet, champ par champ, et c'est la SEULE source du
--      formulaire — ni la description, ni les anciennes entrees, ni le
--      nom de la commande.
--
--   2. Les REFERENCES de fichiers. Une photo personnelle, un produit,
--      un plan : ce ne sont pas des champs de texte, et les compter
--      comme tels faisait afficher « aucun fichier requis » a une carte
--      qui en exige un. `references_fichiers` les tient a part, avec
--      leur condition de necessite.
--
--   3. La GEOMETRIE du rendu. Le cadre de galerie, le ratio de creation,
--      le repli quand aucun ratio n'est determine, le nombre de fichiers
--      finaux, et la facon dont la vignette occupe son cadre. Une planche
--      qu'on recadre perd ses reperes ; un portrait qu'on laisse entier
--      flotte dans du vide. `rendu_galerie` tranche carte par carte.
--
-- TOUT EST NULLABLE. Les 2 206 cartes Images existantes, et les 353
-- cartes Redaction et Assistants, continuent de fonctionner sans une
-- seule de ces valeurs. Aucune colonne n'est retiree, aucune n'est
-- renommee, aucun type n'est change : les ecrans actuels ne voient
-- rien passer.
--
-- LA CLEF D'IMPORT EXISTE DEJA, ET CETTE MIGRATION N'Y TOUCHE PAS.
--
-- Le CSV V3 designe ses cartes par `carte_id`, et ces identifiants sont
-- deja en base dans `prompts.card_id` — 765 sur 765 s'y retrouvent.
-- `prompts_card_id_unique`, pose par le socle V2
-- (`20260915120000_socle_catalogue_v2`), les garde uniques, et il est
-- deja partiel : les 354 cartes Images et les 353 cartes ecrites qui
-- n'ont pas de `card_id` ne se genent pas entre elles.
--
-- Rien a ajouter, donc. C'est note ici parce que c'est la clef sur
-- laquelle l'import retombe a chaque passage, et qu'il faut comprendre
-- pourquoi elle, et pas le slug : l'import RENOMME les slugs, puisque
-- `carte_slug` V3 remplace l'ancien. Une resolution par slug
-- fonctionnerait au premier passage et echouerait au second, qui ne
-- retrouverait plus rien et creerait 862 doublons. `card_id` survit au
-- renommage.
--
-- Rejouable : `add column if not exists`, contraintes deposees avant
-- d'etre reposees.
-- =====================================================================

-- --- Identite et regroupement --------------------------------------------

alter table public.prompts
  add column if not exists commande_titre text,
  add column if not exists variante text,
  add column if not exists description_detaillee text;

comment on column public.prompts.commande_titre is
  'Nom public du groupe de variantes. Identique pour toutes les cartes d''une meme commande.';
comment on column public.prompts.variante is
  'Nom de cette variante dans sa commande. Null quand la commande n''en a qu''une.';

-- --- Classement editorial ------------------------------------------------

alter table public.prompts
  add column if not exists operation text,
  add column if not exists medium text,
  add column if not exists usage_principal text,
  add column if not exists plateformes text[] not null default '{}';

comment on column public.prompts.operation is
  'Intention de traitement : creer, retoucher, restaurer, composer, expliquer, simuler, styliser.';
comment on column public.prompts.plateformes is
  'Canaux cibles. Vide signifie usage general, jamais incompatibilite.';

-- --- Le formulaire, et lui seul ------------------------------------------

alter table public.prompts
  add column if not exists donnees_personnalisables text,
  add column if not exists personnalisation jsonb not null default '[]'::jsonb,
  add column if not exists regime_personnalisation text,
  add column if not exists defauts jsonb not null default '{}'::jsonb,
  add column if not exists references_fichiers jsonb not null default '[]'::jsonb,
  add column if not exists type_reference text,
  add column if not exists condition_reference text;

comment on column public.prompts.personnalisation is
  'Tableau JSON canonique des champs du formulaire, dans l''ordre. Seule source de '
  'l''ecran de copie. Un tableau vide signifie copie directe, pas « champs a deviner ».';
comment on column public.prompts.defauts is
  'Defauts EXPLICITES uniquement. Un exemple de champ n''est jamais un defaut : '
  'un exemple se montre en filigrane, un defaut s''injecte dans le prompt.';
comment on column public.prompts.references_fichiers is
  'Fichiers ou sources a joindre, avec leur condition. Independant des champs '
  'textuels : un formulaire vide n''implique pas « aucun fichier requis ».';

-- Le regime borne le nombre de champs. La contrainte est posee ici plutot
-- que laissee au generateur : un lot mal forme doit echouer en base, pas
-- produire un ecran ou l'on demande huit informations avant de copier.
alter table public.prompts drop constraint if exists prompts_regime_personnalisation_check;
alter table public.prompts add constraint prompts_regime_personnalisation_check
  check (
    regime_personnalisation is null
    or (regime_personnalisation = 'standard' and jsonb_array_length(personnalisation) between 0 and 3)
    or (regime_personnalisation = 'marketing_affiche' and jsonb_array_length(personnalisation) between 2 and 4)
  );

-- --- Geometrie du rendu --------------------------------------------------

alter table public.prompts
  add column if not exists ratio_apercu text,
  add column if not exists ratio_sortie_repli text,
  add column if not exists nombre_images smallint,
  add column if not exists organisation_sortie text,
  add column if not exists format_fichier text,
  add column if not exists rendu_galerie text;

comment on column public.prompts.nombre_images is
  'Nombre de FICHIERS finaux. Quatre pages de photo dump valent quatre ; '
  'une bande dessinee de quatre cases vaut une.';
comment on column public.prompts.rendu_galerie is
  'cover ou contain dans le cadre d''apercu. Une planche, un schema ou une '
  'affiche se montrent entiers : les recadrer leur retire ce qu''ils disent.';

alter table public.prompts drop constraint if exists prompts_rendu_galerie_check;
alter table public.prompts add constraint prompts_rendu_galerie_check
  check (rendu_galerie is null or rendu_galerie in ('cover', 'contain'));

alter table public.prompts drop constraint if exists prompts_organisation_sortie_check;
alter table public.prompts add constraint prompts_organisation_sortie_check
  check (organisation_sortie is null
         or organisation_sortie in ('image_unique', 'planche_unique', 'fichiers_separes'));

-- --- Direction de creation et compatibilite ------------------------------

alter table public.prompts
  add column if not exists pistes_creatives text,
  add column if not exists capacites_requises text[] not null default '{}',
  add column if not exists compatibilite_ia text,
  add column if not exists statut_test_ia text;

comment on column public.prompts.compatibilite_ia is
  'Toujours conditionnelle aux outils reellement disponibles. Ne jamais afficher '
  '« teste compatible » sur cette seule base : le nom d''une IA ne prouve rien.';
comment on column public.prompts.statut_test_ia is
  'non_execute tant qu''aucun rendu n''a ete verifie dans l''IA annoncee.';

-- --- Temoins attendus et suivi editorial ---------------------------------

alter table public.prompts
  add column if not exists temoins_attendus jsonb not null default '[]'::jsonb,
  add column if not exists statut_editorial text,
  add column if not exists statut_validation text,
  add column if not exists reference_inspiration text,
  add column if not exists test_personnalisation text,
  add column if not exists test_visuel text;

comment on column public.prompts.temoins_attendus is
  'Briefs des exemples visuels a produire. Ce sont des consignes, jamais des '
  'URL ni une preuve qu''une image existe.';
comment on column public.prompts.reference_inspiration is
  'Provenance editoriale. N''emporte aucune revendication de propriete sur '
  'les images de reference.';

-- --- La clef de l'import : rien a faire ----------------------------------
--
-- `prompts_card_id_unique` existe depuis le socle V2, au caractere pres
-- tel qu'il faudrait l'ecrire. Le reposer ici serait au mieux inutile,
-- au pire trompeur : une relecture croirait que la garantie arrive avec
-- la V3, alors qu'elle tient depuis septembre. La verification vit dans
-- `tests/integration/43_visuels_v3.sql`, qui la traite comme un acquis
-- a ne pas perdre plutot que comme un apport.
