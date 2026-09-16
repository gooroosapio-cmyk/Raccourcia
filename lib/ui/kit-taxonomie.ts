// Genere par scripts/generer-kit-ui.mjs — ne pas modifier a la main.
// Source : data/kit-ui/03_TAXONOMIE_ASSETS.json + data/kit-ui/heritages.json

/** Ce qu'un rayon ou une famille emprunte au kit. */
export type AssetsDuRayon = { icone: string; illustration: string; description: string };
export type AssetsDeLaFamille = { icone: string; description: string };

/**
 * Par slug de rayon, tel que la base le porte apres le rangement.
 *
 * Neuf entrees sont des heritages : le kit decrit la taxonomie du classeur
 * V2, neuf rayons ont depuis change de nom ou fusionne. Les clefs d'origine
 * ne figurent plus ici — les rayons qui les portaient n'existent plus.
 */
export const ASSETS_PAR_RAYON: Record<string, AssetsDuRayon> = {
  "epoques": {"icone":"icon-epoques","illustration":"illus-epoques","description":"Voyagez entre souvenirs et futurs imaginés."},
  "relations": {"icone":"icon-relations","illustration":"illus-relations","description":"Créez des souvenirs avec les personnes qui comptent."},
  "celebrations": {"icone":"icon-celebrations","illustration":"illus-celebrations","description":"Portraits et supports pour marquer les grands moments."},
  "cultures": {"icone":"icon-cultures","illustration":"illus-cultures","description":"Des portraits ancrés dans des références choisies."},
  "voyages": {"icone":"icon-voyages","illustration":"illus-voyages","description":"Placez vos souvenirs dans des destinations inspirantes."},
  "beaute": {"icone":"icon-beaute","illustration":"illus-beaute","description":"Coiffures, maquillage et essais beauté."},
  "essayage": {"icone":"icon-essayage","illustration":"illus-essayage","description":"Explorez des tenues et des accessoires."},
  "portrait-pro": {"icone":"icon-portrait-pro","illustration":"illus-portrait-pro","description":"Des portraits adaptés à votre activité."},
  "retouche": {"icone":"icon-retouche","illustration":"illus-retouche","description":"Nettoyez, restaurez et recadrez vos photos."},
  "humour": {"icone":"icon-humour","illustration":"illus-humour","description":"Transformez le quotidien en scène amusante."},
  "jeux-visuels": {"icone":"icon-jeux-visuels","illustration":"illus-jeux-visuels","description":"Vos choix deviennent une création originale."},
  "cinema-action-et-espionnage": {"icone":"icon-cinema-action-et-espionnage","illustration":"illus-cinema-action-et-espionnage","description":"Affiches d’action et missions cinématographiques."},
  "editorial-business-et-parcours": {"icone":"icon-editorial-business-et-parcours","illustration":"illus-editorial-business-et-parcours","description":"Mettez en scène votre parcours professionnel."},
  "editorial-sport-et-performance": {"icone":"icon-editorial-sport-et-performance","illustration":"illus-editorial-sport-et-performance","description":"Valorisez le mouvement et la performance."},
  "montages-originaux": {"icone":"icon-montages-originaux","illustration":"illus-montages-originaux","description":"Assemblez images, papiers et doubles expositions."},
  "humour-et-scenes-atypiques": {"icone":"icon-humour-et-scenes-atypiques","illustration":"illus-humour-et-scenes-atypiques","description":"Inventez des situations visuelles inattendues."},
  "dessins-et-manuscrits": {"icone":"icon-dessins-et-manuscrits","illustration":"illus-dessins-et-manuscrits","description":"Transformez vos images en dessins et carnets."},
  "editorial-musique-et-pop-culture": {"icone":"icon-editorial-musique-et-pop-culture","illustration":"illus-editorial-musique-et-pop-culture","description":"Créez pochettes et couvertures musicales."},
  "photo-produit": {"icone":"icon-photo-produit","illustration":"illus-photo-produit","description":"Des mises en lumière pour vos produits."},
  "usage": {"icone":"icon-usage","illustration":"illus-usage","description":"Montrez le produit dans son contexte réel."},
  "preparation": {"icone":"icon-preparation","illustration":"illus-preparation","description":"Préparez des fichiers propres pour la vente."},
  "restauration": {"icone":"icon-restauration","illustration":"illus-restauration","description":"Valorisez ce qui est réellement servi."},
  "commerce-local": {"icone":"icon-commerce-local","illustration":"illus-commerce-local","description":"Créez les supports visuels d’une activité de proximité."},
  "createurs": {"icone":"icon-createurs","illustration":"illus-createurs","description":"Présentez un projet créatif ou musical."},
  "publicites": {"icone":"icon-publicites","illustration":"illus-publicites","description":"Construisez une campagne autour d’un bénéfice réel."},
  "offres": {"icone":"icon-offres","illustration":"illus-offres","description":"Rendez prix, lots et comparaisons plus lisibles."},
  "packaging": {"icone":"icon-packaging","illustration":"illus-packaging","description":"Visualisez vos emballages et leurs déclinaisons."},
  "pedagogie": {"icone":"icon-pedagogie","illustration":"illus-pedagogie","description":"Expliquez clairement une notion ou un mouvement."},
  "concepts": {"icone":"icon-concepts","illustration":"illus-concepts","description":"Projetez un objet dans un univers créatif."},
  "documentation": {"icone":"icon-documentation","illustration":"illus-documentation","description":"Expliquez formes, pièces et fonctionnement."},
  "matieres": {"icone":"icon-matieres","illustration":"illus-matieres","description":"Testez couleurs, textures et finitions."},
  "espaces": {"icone":"icon-espaces","illustration":"illus-espaces","description":"Projetez un aménagement sans masquer l’existant."},
  "professionnels-et-vente": {"icone":"icon-professionnels-et-vente","illustration":"illus-professionnels-et-vente","description":"Préparez vos messages et vos échanges."},
  "critiques-et-roasts": {"icone":"icon-critiques-et-roasts","illustration":"illus-critiques-et-roasts","description":"Mettez vos idées à l’épreuve."},
  "clarte-et-modeles-mentaux": {"icone":"icon-clarte-et-modeles-mentaux","illustration":"illus-clarte-et-modeles-mentaux","description":"Comprenez, structurez et décidez."},
  "personnages-immersifs": {"icone":"icon-personnages-immersifs","illustration":"illus-personnages-immersifs","description":"Explorez une conversation jouée."},
  "jeux-enigmes-et-simulations": {"icone":"icon-jeux-enigmes-et-simulations","illustration":"illus-jeux-enigmes-et-simulations","description":"Jouez, enquêtez et entraînez-vous."},
  "creativite-et-angles-inattendus": {"icone":"icon-creativite-et-angles-inattendus","illustration":"illus-creativite-et-angles-inattendus","description":"Faites émerger des pistes nouvelles."},
  "style-et-conseil-personnel": {"icone":"icon-style-et-conseil-personnel","illustration":"illus-style-et-conseil-personnel","description":"Composez des choix qui vous conviennent."},
  "parcours-visuels": {"icone":"icon-parcours-visuels","illustration":"illus-parcours-visuels","description":"Produisez une série de visuels cohérents."},
  "parcours-mixtes-et-modes": {"icone":"icon-parcours-mixtes-et-modes","illustration":"illus-parcours-mixtes-et-modes","description":"Avancez du cadrage aux livrables."},
  "cinema": {"icone":"icon-cinema-personnages-et-scenes","illustration":"illus-cinema-personnages-et-scenes","description":"Personnages, affiches et scènes de cinéma originaux."},
  "editorial": {"icone":"icon-editorial-mode-et-beaute","illustration":"illus-editorial-mode-et-beaute","description":"Couvertures et portraits de magazine, de la mode au parcours professionnel."},
  "signatures-picturales": {"icone":"icon-peintres-et-signatures-picturales","illustration":"illus-peintres-et-signatures-picturales","description":"Réinterprétez vos images par les grands langages picturaux."},
  "mouvements-artistiques": {"icone":"icon-illustration-et-mouvements-artistiques","illustration":"illus-illustration-et-mouvements-artistiques","description":"Explorez illustrations, estampes et mouvements graphiques."},
  "matieres-et-metamorphoses": {"icone":"icon-matieres-jouets-et-metamorphoses","illustration":"illus-matieres-jouets-et-metamorphoses","description":"Transformez le sujet en matière, figurine ou sculpture."},
  "effets-de-scene": {"icone":"icon-vfx-effets-de-scene","illustration":"illus-vfx-effets-de-scene","description":"Ajoutez des effets spectaculaires à une scène."},
  "espace-et-gravite": {"icone":"icon-vfx-espace-et-gravite","illustration":"illus-vfx-espace-et-gravite","description":"Pliez l’espace, l’échelle et la gravité."},
  "lumiere-et-optique": {"icone":"icon-vfx-lumiere-et-optique","illustration":"illus-vfx-lumiere-et-optique","description":"Créez avec halos, prismes et lumières."},
  "particules-et-metamorphoses": {"icone":"icon-vfx-particules-et-metamorphoses","illustration":"illus-vfx-particules-et-metamorphoses","description":"Faites évoluer le sujet en fleurs, fumée ou particules."},
};

/** Par slug de famille. Les huit clefs du classeur sont restees valides. */
export const ASSETS_PAR_FAMILLE: Record<string, AssetsDeLaFamille> = {
  "portraits-et-souvenirs": {"icone":"cat-portraits-et-souvenirs","description":"Personnes, relations, célébrations, cultures et voyages."},
  "style-et-identite": {"icone":"cat-style-et-identite","description":"Beauté, essayage, portraits professionnels et retouche."},
  "creations-et-vfx": {"icone":"cat-creations-et-vfx","description":"Univers artistiques, cinéma, humour et effets visuels."},
  "produit-et-e-commerce": {"icone":"cat-produit-et-e-commerce","description":"Photos produit, usages, préparation et restauration."},
  "publicite-et-marque": {"icone":"cat-publicite-et-marque","description":"Commerce, campagnes, offres, créateurs et packaging."},
  "design-et-technique": {"icone":"cat-design-et-technique","description":"Pédagogie, concepts, documentation, matières et espaces."},
  "modes-ia": {"icone":"cat-modes-ia","description":"Rôles interactifs pour réfléchir, créer et s’entraîner."},
  "parcours-guides": {"icone":"cat-parcours-guides","description":"Objectifs structurés qui mènent à plusieurs livrables."},
};
