-- =====================================================================
-- Fusion des deux catalogues : ou vont les commandes deja en ligne
--
-- Le catalogue de septembre 2026 apporte 1 010 cartes conçues de zero :
-- aucune ne reprend l'identifiant d'une commande existante, et seules 49
-- des 596 commandes publiees portent encore le meme nom. Les publier en
-- archivant les anciennes ferait donc disparaitre l'affichage de tous les
-- visuels deposes depuis des semaines.
--
-- On fusionne : les commandes image deja en ligne rejoignent les nouvelles
-- collections avec leurs visuels, leurs favoris et leurs compteurs. Elles
-- gardent leur identifiant — rien n'est recree, tout est deplace.
--
-- LA CORRESPONDANCE EST ECRITE, PAS DEVINEE. Quarante-quatre anciennes
-- collections vers soixante-treize nouvelles : aucun rapprochement
-- automatique ne rendrait ce choix, et un rapprochement approximatif
-- rangerait un portrait dans les emballages sans que rien ne le signale.
-- Chaque ligne ci-dessous est un choix editorial, relisible et corrigeable
-- depuis l'administration.
--
-- Rejouable : la reaffectation vise les commandes par leur ancienne
-- collection, et une commande deja deplacee n'y figure plus.
-- =====================================================================

begin;

create temporary table lot_fusion (ancien text, nouveau text) on commit drop;

insert into lot_fusion (ancien, nouveau) values
  -- --- Creations et VFX -> Effets, Arts, Mondes imaginaires -------------
  ('mouvements-artistiques',            'peinture-et-grands-maitres'),
  ('signatures-picturales',             'peinture-et-grands-maitres'),
  ('cinema',                            'cinema-et-pop-culture'),
  ('dessins-et-manuscrits',             'dessin-et-ecriture'),
  ('jeux-visuels',                      'scenes-et-detournements'),
  ('humour',                            'scenes-et-detournements'),
  -- « Editorial » rangeait des portraits de mode, de musique et de sport,
  -- pas des couvertures de presse : /afrobeatsstar y cotoyait /sportcover.
  -- Il rejoint donc les portraits, et non l'edition.
  ('editorial',                         'portrait-et-editorial'),
  ('montages-originaux',                'compositing-et-decors'),
  ('effets-de-scene',                   'lumiere-et-optique'),
  ('espace-et-gravite',                 'temps-et-mouvement'),
  ('particules-et-metamorphoses',       'matieres-et-metamorphoses'),
  ('matieres-et-metamorphoses-avant-v2','matieres-et-metamorphoses'),
  ('lumiere-et-optique-avant-v2',       'lumiere-et-optique'),

  -- --- Design et technique -> Plans, Pedagogie, Espaces ----------------
  ('documentation',                     'plans-et-documentation'),
  ('matieres',                          'matieres-et-metamorphoses'),
  ('pedagogie',                         'comprendre-et-comparer'),
  ('concepts',                          'sciences-et-technique'),
  ('espaces',                           'architecture-et-urbanisme'),

  -- --- Portraits et souvenirs -> Cultures, Epoques, Liens --------------
  ('cultures',                          'patrimoines-africains'),
  ('epoques-avant-v2',                  'photographie-du-xxe-siecle'),
  ('relations',                         'liens-et-souvenirs'),
  ('celebrations',                      'fetes-et-calendrier'),
  ('voyages',                           'destinations-du-monde'),

  -- --- Produit et e-commerce -------------------------------------------
  ('photo-produit',                     'presentation-produit'),
  ('preparation',                       'presentation-produit'),
  ('usage',                             'univers-de-consommation'),
  ('restauration',                      'univers-de-consommation'),

  -- --- Publicite et marque ---------------------------------------------
  ('publicites',                        'campagnes-et-acquisition'),
  ('commerce-local',                    'campagnes-et-acquisition'),
  ('offres',                            'campagnes-et-acquisition'),
  ('packaging',                         'identite-et-direction-artistique'),
  ('createurs',                         'identite-et-direction-artistique'),

  -- --- Style et identite ------------------------------------------------
  ('portrait-pro',                      'portrait-et-editorial'),
  ('essayage',                          'style-et-essayage'),
  ('beaute',                            'beaute-et-coiffure'),
  ('retouche',                          'transformation-et-identite');

-- La destination doit exister, sinon la commande partirait dans le vide.
do $$
declare v_inconnues text;
begin
  select string_agg(distinct l.nouveau, ', ') into v_inconnues
  from lot_fusion l
  where not exists (
    select 1 from public.categories c
    where c.slug = l.nouveau and c.external_ref like 'V2COL-%');

  if v_inconnues is not null then
    raise exception 'Fusion : collection(s) de destination introuvable(s) : %', v_inconnues;
  end if;
end $$;

-- Le deplacement. `library` suit : ces commandes rejoignent la bibliotheque
-- Images, qui est celle de toutes les collections visees ici.
--
-- Les brouillons suivent leurs publiees. Ne deplacer que ce qui est en
-- ligne laisserait des rayons a moitie vides qu'on ne peut ni fermer — ils
-- portent encore quelque chose — ni retrouver, puisqu'ils ne sont plus
-- dans la Bibliotheque. Un brouillon reste un brouillon : il change de
-- rangement, pas de statut.
update public.prompts p
set category_id = destination.id,
    library = 'images'::public.app_library,
    updated_at = now()
from lot_fusion l
join public.categories ancienne on ancienne.slug = l.ancien
join public.categories destination
  on destination.slug = l.nouveau and destination.external_ref like 'V2COL-%'
where p.category_id = ancienne.id
  and p.status <> 'archived';

do $rapport$
declare
  v_restantes integer;
  v_deplacees integer;
begin
  select count(*) into v_deplacees
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.status = 'published' and c.external_ref like 'V2COL-%';

  select count(*) into v_restantes
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.status = 'published'
    and (c.external_ref is null
         or (c.external_ref not like 'V2COL-%' and c.external_ref not like 'V2CAT-%'));

  raise notice 'Fusion : % commande(s) publiee(s) dans les nouvelles collections, % encore dans l''ancienne arborescence.',
    v_deplacees, v_restantes;
end $rapport$;

commit;
