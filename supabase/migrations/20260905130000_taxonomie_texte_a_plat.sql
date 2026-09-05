-- =====================================================================
-- RaccourcIA - 18. Taxonomie texte remise a plat
--
-- Le filtre de la bibliotheque aplatit racines et sous-categories dans une
-- meme rangee de chips (`library-filters.tsx`). Le mode texte en comptait
-- 5 + 22, soit 27 chips a faire defiler sur un ecran de 360 px, la ou le
-- mode image en affiche 7. Le decoupage etait par ailleurs tres inegal :
-- dix sous-categories sous « Marketing et contenu », dont cinq ne portaient
-- qu'un seul raccourci.
--
-- Le texte adopte donc la structure qui fonctionne deja pour l'image : des
-- categories racines, a plat, sans enfant. Six categories, entre 5 et 10
-- raccourcis chacune.
--
--   Marketing et contenu   SEO, Marketing, Publicite, Storytelling, Creatif
--   Marque et reseaux      Branding, Naming, Social, Video, PR
--   Vente et produit       Business, Produit, Preuves
--   Redaction et synthese  Reecriture, Documents, Synthese
--   Communication          Email, Reunions
--   Interne et RH          RH, Education, Conformite, Operations
--
-- Aucune categorie n'est supprimee : les sous-categories passent en
-- `archived`, ce qui les rend invisibles sans rien perdre de l'historique.
-- Les raccourcis, eux, ne sont jamais touches autrement que par leur
-- rattachement.
--
-- L'archivage porte sur 32 sous-categories, non sur les 22 reclassees
-- ci-dessous : la clause vise toute sous-categorie de mode texte, ce qui
-- englobe les 10 coquilles restees de la taxonomie `catalogue_v2`
-- (« Business & croissance », « Travail & pilotage »...). Toutes sont vides,
-- verifie avant application — aucun raccourci n'y etait rattache.
-- =====================================================================

-- Seule racine manquante : les quatre autres existent deja et sont reutilisees.
insert into public.categories (slug, parent_id, mode, name, status, sort_order)
values ('texte-marque-reseaux', null, 'texte', 'Marque et réseaux', 'published', 2)
on conflict (slug) do update
  set name = excluded.name, status = excluded.status, sort_order = excluded.sort_order;

update public.categories set name = 'Rédaction et synthèse' where slug = 'texte-redaction';

-- Ordre d'affichage des chips, du plus frequent au plus specialise.
update public.categories set sort_order = v.rang
from (values
  ('texte-marketing-contenu', 1), ('texte-marque-reseaux', 2), ('texte-vente-produit', 3),
  ('texte-redaction', 4), ('texte-communication', 5), ('texte-interne-rh', 6)
) as v(slug, rang)
where public.categories.slug = v.slug;

-- --- Rattachement des raccourcis ---------------------------------------
-- Chaque ancienne sous-categorie est reportee sur sa racine cible.
update public.prompts p
set category_id = cible.id
from (values
  ('texte-marketing-contenu-seo',          'texte-marketing-contenu'),
  ('texte-marketing-contenu-marketing',    'texte-marketing-contenu'),
  ('texte-marketing-contenu-publicite',    'texte-marketing-contenu'),
  ('texte-marketing-contenu-storytelling', 'texte-marketing-contenu'),
  ('texte-marketing-contenu-creatif',      'texte-marketing-contenu'),
  ('texte-marketing-contenu-branding',     'texte-marque-reseaux'),
  ('texte-marketing-contenu-naming',       'texte-marque-reseaux'),
  ('texte-marketing-contenu-social',       'texte-marque-reseaux'),
  ('texte-marketing-contenu-video',        'texte-marque-reseaux'),
  ('texte-marketing-contenu-pr',           'texte-marque-reseaux'),
  ('texte-vente-produit-business',         'texte-vente-produit'),
  ('texte-vente-produit-produit',          'texte-vente-produit'),
  ('texte-vente-produit-preuves',          'texte-vente-produit'),
  ('texte-redaction-reecriture',           'texte-redaction'),
  ('texte-redaction-documents',            'texte-redaction'),
  ('texte-communication-synthese',         'texte-redaction'),
  ('texte-communication-email',            'texte-communication'),
  ('texte-communication-reunions',         'texte-communication'),
  ('texte-interne-rh-rh',                  'texte-interne-rh'),
  ('texte-interne-rh-education',           'texte-interne-rh'),
  ('texte-interne-rh-conformite',          'texte-interne-rh'),
  ('texte-interne-rh-operations',          'texte-interne-rh')
) as m(ancienne, nouvelle)
join public.categories source on source.slug = m.ancienne
join public.categories cible on cible.slug = m.nouvelle
where p.category_id = source.id;

-- --- Retrait des sous-categories ----------------------------------------
-- Archivees, jamais supprimees : le catalogue ne perd pas sa memoire, et
-- `is_visible` retombe a false par le declencheur de visibilite.
update public.categories
set status = 'archived'
where mode = 'texte'
  and parent_id is not null
  and status <> 'archived';
