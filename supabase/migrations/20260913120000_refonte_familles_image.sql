-- =====================================================================
-- Refonte du domaine Image : les trois familles qui remplacent les six.
--
-- Six rayons pour une bibliotheque d'images, c'est une rangee de chips
-- qu'il faut faire defiler avant de choisir. Trois tiennent a l'ecran et
-- se decident d'un regard. Le regroupement suit ce que les gens viennent
-- chercher, pas la logique du catalogue :
--
--   Portraits et effets visuels  <- Portrait, mode et identite
--                                 + Creation, styles et effets visuels
--   Publicite et marques         <- Publicite et contenu commercial
--                                 + Produit et marque
--   Techniques et lieux          <- Technique, information et visualisation
--                                 + Lieux, architecture et interieur
--
-- L'ordre est impose et non alphabetique : Portraits d'abord, parce que
-- c'est la porte d'entree la plus frequentee, Publicite ensuite, Techniques
-- en dernier.
--
-- Cette migration ne fait que poser les familles, en brouillon et
-- invisibles. Le deplacement des commandes appartient a
-- `supabase/seed/bascule-image-v6.sql` : une migration s'applique avant que
-- le catalogue existe, elle n'a donc rien a deplacer et ne peut rien
-- verifier. C'est le partage qu'avait deja la bascule V5.
--
-- Nouvelles references (IMG-V6-xx) et non reprise des anciennes : reutiliser
-- une reference avec un autre sens ferait basculer des commandes sans que
-- personne ne l'ait demande.
-- =====================================================================

insert into public.categories (
  external_ref, mode, slug, name, short_description, sort_order,
  status, is_visible, fallback_image_path
)
select v.external_ref, 'image'::public.app_mode, v.slug, v.name, v.description, v.ordre,
       'draft'::public.content_status, false,
       'prompt-media/families/image/' || v.slug || '.webp'
from (values
  ('IMG-V6-01', 'portraits-et-effets-visuels', 'Portraits et effets visuels',
   'Valorisez une personne, un style ou une image avec un effet distinctif.', 1),
  ('IMG-V6-02', 'publicite-et-marques', 'Publicité et marques',
   'Mettez une offre, un produit ou une marque en valeur.', 2),
  ('IMG-V6-03', 'techniques-et-lieux', 'Techniques et lieux',
   'Expliquez une structure en image, ou projetez l’aménagement d’un lieu.', 3)
) as v(external_ref, slug, name, description, ordre)
where not exists (
  select 1 from public.categories c where c.external_ref = v.external_ref
);

-- Le nom, la description et l'ordre font autorite ici : une reprise les
-- remet en place sans toucher au statut, qui appartient a la bascule.
update public.categories c
set name = v.name,
    short_description = v.description,
    sort_order = v.ordre
from (values
  ('IMG-V6-01', 'Portraits et effets visuels',
   'Valorisez une personne, un style ou une image avec un effet distinctif.', 1),
  ('IMG-V6-02', 'Publicité et marques',
   'Mettez une offre, un produit ou une marque en valeur.', 2),
  ('IMG-V6-03', 'Techniques et lieux',
   'Expliquez une structure en image, ou projetez l’aménagement d’un lieu.', 3)
) as v(external_ref, name, description, ordre)
where c.external_ref = v.external_ref;
