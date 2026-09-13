-- =====================================================================
-- Domaine Image : la famille technique se dedouble.
--
-- « Techniques et lieux » melangeait deux intentions qui ne se cherchent
-- pas ensemble : expliquer une structure en image, et projeter
-- l'amenagement d'un lieu. Quatre rayons tiennent aussi en deux colonnes,
-- et le dernier ne reste plus seul sur sa ligne.
--
-- Cette migration pose la quatrieme famille, en brouillon et invisible, et
-- renomme la troisieme. Le deplacement appartient a la bascule
-- `supabase/seed/bascule-image-v6-quatre.sql` : ici le catalogue n'existe
-- pas encore.
--
-- Idempotente : elle se reconnait a `external_ref`.
--
-- Pour revenir en arriere, republier IMG-V6-03 sous son ancien nom et
-- ramener les commandes d'IMG-V6-04 : rien n'est supprime.
-- =====================================================================

insert into public.categories (
  external_ref, mode, slug, name, short_description, sort_order,
  status, is_visible, fallback_image_path
)
select
  'IMG-V6-04', 'image'::public.app_mode, 'architecture-et-lieux',
  'Architecture et lieux',
  'Projetez l’aménagement d’un lieu, une façade, un intérieur.',
  4, 'draft'::public.content_status, false,
  'prompt-media/families/image/architecture-et-lieux.webp'
where not exists (
  select 1 from public.categories c where c.external_ref = 'IMG-V6-04'
);

-- Le libelle et le rang sont reaffirmes a chaque passage : ils decrivent le
-- rayon, ils ne portent pas son etat. Le statut, lui, n'est jamais touche
-- ici — c'est la bascule qui ouvre le rayon.
update public.categories set
  slug = 'architecture-et-lieux',
  name = 'Architecture et lieux',
  short_description = 'Projetez l’aménagement d’un lieu, une façade, un intérieur.',
  sort_order = 4,
  fallback_image_path = 'prompt-media/families/image/architecture-et-lieux.webp'
where external_ref = 'IMG-V6-04';

-- La troisieme famille perd les lieux et ne garde que la technique.
update public.categories set
  slug = 'technique-et-information',
  name = 'Technique et information',
  short_description = 'Expliquez une structure, un fonctionnement ou des données en image.',
  sort_order = 3,
  fallback_image_path = 'prompt-media/families/image/technique-et-information.webp'
where external_ref = 'IMG-V6-03';
