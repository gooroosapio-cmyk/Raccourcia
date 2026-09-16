-- =====================================================================
-- Descriptions des familles et des rayons
--
-- Genere par scripts/generer-kit-ui.mjs depuis data/kit-ui/03_TAXONOMIE_ASSETS.json.
-- Ne pas modifier a la main : regenerer.
--
-- Ce que la tuile d'un rayon disait jusqu'ici, c'etait son nombre de
-- commandes. Un compteur ne fait pas choisir : « 16 commandes » ne dit pas
-- si l'on y trouvera ce qu'on cherche. Une phrase le dit.
--
-- Deux rayons ont vu leur description reecrite plutot que reprise : « Cinema »
-- et « Editorial » reunissent chacun plusieurs anciens rayons, et la phrase
-- du manifeste, ecrite pour un seul d'entre eux, aurait annonce trop peu.
--
-- Rejouable : des affectations, aucune insertion, aucune suppression. Un
-- slug absent de la base ne fait rien.
-- =====================================================================

update public.categories set short_description = 'Personnes, relations, célébrations, cultures et voyages.' where slug = 'portraits-et-souvenirs' and parent_id is null;
update public.categories set short_description = 'Beauté, essayage, portraits professionnels et retouche.' where slug = 'style-et-identite' and parent_id is null;
update public.categories set short_description = 'Univers artistiques, cinéma, humour et effets visuels.' where slug = 'creations-et-vfx' and parent_id is null;
update public.categories set short_description = 'Photos produit, usages, préparation et restauration.' where slug = 'produit-et-e-commerce' and parent_id is null;
update public.categories set short_description = 'Commerce, campagnes, offres, créateurs et packaging.' where slug = 'publicite-et-marque' and parent_id is null;
update public.categories set short_description = 'Pédagogie, concepts, documentation, matières et espaces.' where slug = 'design-et-technique' and parent_id is null;
update public.categories set short_description = 'Rôles interactifs pour réfléchir, créer et s’entraîner.' where slug = 'modes-ia' and parent_id is null;
update public.categories set short_description = 'Objectifs structurés qui mènent à plusieurs livrables.' where slug = 'parcours-guides' and parent_id is null;
update public.categories set short_description = 'Voyagez entre souvenirs et futurs imaginés.' where slug = 'epoques' and parent_id is not null;
update public.categories set short_description = 'Créez des souvenirs avec les personnes qui comptent.' where slug = 'relations' and parent_id is not null;
update public.categories set short_description = 'Portraits et supports pour marquer les grands moments.' where slug = 'celebrations' and parent_id is not null;
update public.categories set short_description = 'Des portraits ancrés dans des références choisies.' where slug = 'cultures' and parent_id is not null;
update public.categories set short_description = 'Placez vos souvenirs dans des destinations inspirantes.' where slug = 'voyages' and parent_id is not null;
update public.categories set short_description = 'Coiffures, maquillage et essais beauté.' where slug = 'beaute' and parent_id is not null;
update public.categories set short_description = 'Explorez des tenues et des accessoires.' where slug = 'essayage' and parent_id is not null;
update public.categories set short_description = 'Des portraits adaptés à votre activité.' where slug = 'portrait-pro' and parent_id is not null;
update public.categories set short_description = 'Nettoyez, restaurez et recadrez vos photos.' where slug = 'retouche' and parent_id is not null;
update public.categories set short_description = 'Transformez le quotidien en scène amusante.' where slug = 'humour' and parent_id is not null;
update public.categories set short_description = 'Vos choix deviennent une création originale.' where slug = 'jeux-visuels' and parent_id is not null;
update public.categories set short_description = 'Affiches d’action et missions cinématographiques.' where slug = 'cinema-action-et-espionnage' and parent_id is not null;
update public.categories set short_description = 'Mettez en scène votre parcours professionnel.' where slug = 'editorial-business-et-parcours' and parent_id is not null;
update public.categories set short_description = 'Valorisez le mouvement et la performance.' where slug = 'editorial-sport-et-performance' and parent_id is not null;
update public.categories set short_description = 'Assemblez images, papiers et doubles expositions.' where slug = 'montages-originaux' and parent_id is not null;
update public.categories set short_description = 'Inventez des situations visuelles inattendues.' where slug = 'humour-et-scenes-atypiques' and parent_id is not null;
update public.categories set short_description = 'Transformez vos images en dessins et carnets.' where slug = 'dessins-et-manuscrits' and parent_id is not null;
update public.categories set short_description = 'Créez pochettes et couvertures musicales.' where slug = 'editorial-musique-et-pop-culture' and parent_id is not null;
update public.categories set short_description = 'Des mises en lumière pour vos produits.' where slug = 'photo-produit' and parent_id is not null;
update public.categories set short_description = 'Montrez le produit dans son contexte réel.' where slug = 'usage' and parent_id is not null;
update public.categories set short_description = 'Préparez des fichiers propres pour la vente.' where slug = 'preparation' and parent_id is not null;
update public.categories set short_description = 'Valorisez ce qui est réellement servi.' where slug = 'restauration' and parent_id is not null;
update public.categories set short_description = 'Créez les supports visuels d’une activité de proximité.' where slug = 'commerce-local' and parent_id is not null;
update public.categories set short_description = 'Présentez un projet créatif ou musical.' where slug = 'createurs' and parent_id is not null;
update public.categories set short_description = 'Construisez une campagne autour d’un bénéfice réel.' where slug = 'publicites' and parent_id is not null;
update public.categories set short_description = 'Rendez prix, lots et comparaisons plus lisibles.' where slug = 'offres' and parent_id is not null;
update public.categories set short_description = 'Visualisez vos emballages et leurs déclinaisons.' where slug = 'packaging' and parent_id is not null;
update public.categories set short_description = 'Expliquez clairement une notion ou un mouvement.' where slug = 'pedagogie' and parent_id is not null;
update public.categories set short_description = 'Projetez un objet dans un univers créatif.' where slug = 'concepts' and parent_id is not null;
update public.categories set short_description = 'Expliquez formes, pièces et fonctionnement.' where slug = 'documentation' and parent_id is not null;
update public.categories set short_description = 'Testez couleurs, textures et finitions.' where slug = 'matieres' and parent_id is not null;
update public.categories set short_description = 'Projetez un aménagement sans masquer l’existant.' where slug = 'espaces' and parent_id is not null;
update public.categories set short_description = 'Préparez vos messages et vos échanges.' where slug = 'professionnels-et-vente' and parent_id is not null;
update public.categories set short_description = 'Mettez vos idées à l’épreuve.' where slug = 'critiques-et-roasts' and parent_id is not null;
update public.categories set short_description = 'Comprenez, structurez et décidez.' where slug = 'clarte-et-modeles-mentaux' and parent_id is not null;
update public.categories set short_description = 'Explorez une conversation jouée.' where slug = 'personnages-immersifs' and parent_id is not null;
update public.categories set short_description = 'Jouez, enquêtez et entraînez-vous.' where slug = 'jeux-enigmes-et-simulations' and parent_id is not null;
update public.categories set short_description = 'Faites émerger des pistes nouvelles.' where slug = 'creativite-et-angles-inattendus' and parent_id is not null;
update public.categories set short_description = 'Composez des choix qui vous conviennent.' where slug = 'style-et-conseil-personnel' and parent_id is not null;
update public.categories set short_description = 'Produisez une série de visuels cohérents.' where slug = 'parcours-visuels' and parent_id is not null;
update public.categories set short_description = 'Avancez du cadrage aux livrables.' where slug = 'parcours-mixtes-et-modes' and parent_id is not null;
update public.categories set short_description = 'Personnages, affiches et scènes de cinéma originaux.' where slug = 'cinema' and parent_id is not null;
update public.categories set short_description = 'Couvertures et portraits de magazine, de la mode au parcours professionnel.' where slug = 'editorial' and parent_id is not null;
update public.categories set short_description = 'Réinterprétez vos images par les grands langages picturaux.' where slug = 'signatures-picturales' and parent_id is not null;
update public.categories set short_description = 'Explorez illustrations, estampes et mouvements graphiques.' where slug = 'mouvements-artistiques' and parent_id is not null;
update public.categories set short_description = 'Transformez le sujet en matière, figurine ou sculpture.' where slug = 'matieres-et-metamorphoses' and parent_id is not null;
update public.categories set short_description = 'Ajoutez des effets spectaculaires à une scène.' where slug = 'effets-de-scene' and parent_id is not null;
update public.categories set short_description = 'Pliez l’espace, l’échelle et la gravité.' where slug = 'espace-et-gravite' and parent_id is not null;
update public.categories set short_description = 'Créez avec halos, prismes et lumières.' where slug = 'lumiere-et-optique' and parent_id is not null;
update public.categories set short_description = 'Faites évoluer le sujet en fleurs, fumée ou particules.' where slug = 'particules-et-metamorphoses' and parent_id is not null;

do $verif$
declare
  v_n integer;
begin
  select count(*) into v_n
  from public.categories
  where is_visible and coalesce(short_description, '') = '';

  if v_n > 0 then
    raise notice 'Descriptions : % rayon(s) visible(s) encore sans phrase.', v_n;
  end if;
end $verif$;
