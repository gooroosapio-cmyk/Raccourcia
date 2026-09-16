/**
 * Les collections qui ont change d'adresse lors du rangement des rayons.
 *
 * Les noms a prefixe — « Cinéma - personnages et scènes », « Éditorial -
 * Mode et beauté », « VFX - effets de scène » — disaient d'ou venait le
 * rangement, pas ce qu'on y trouvait. Ils sont devenus des titres autonomes,
 * et le slug les a suivis.
 *
 * Un lien partage, un favori de navigateur ou un resultat de moteur pointe
 * encore sur l'ancienne adresse : une collection qui repond « introuvable »
 * apres une refonte de nommage est une erreur de notre cote, pas de celui
 * qui a garde le lien. La redirection est permanente — l'ancienne adresse
 * ne reviendra pas.
 */
export const COLLECTIONS_RENOMMEES: Record<string, string> = {
  'cinema-personnages-et-scenes': 'personnages-cultes',
  'cinema-action-et-espionnage': 'action-et-espionnage',
  'cinema-sf-et-exploration': 'affiches-de-cinema',
  'cinema-romance-et-comedie': 'ambiances-de-cinema',
  'cinema-fantastique-et-mystere': 'fantastique-et-mystere',
  'editorial-mode-et-beaute': 'mode-et-beaute',
  'editorial-business-et-parcours': 'business-et-leadership',
  'editorial-sport-et-performance': 'sport-et-performance',
  'editorial-musique-et-pop-culture': 'musique-et-pop-culture',
  'vfx-effets-de-scene': 'effets-de-scene',
  'vfx-espace-et-gravite': 'espace-et-gravite',
  'vfx-lumiere-et-optique': 'lumiere-et-optique',
  'vfx-particules-et-metamorphoses': 'particules-et-metamorphoses',
  'humour-et-scenes-atypiques': 'scenes-atypiques',
  'peintres-et-signatures-picturales': 'signatures-picturales',
  'illustration-et-mouvements-artistiques': 'mouvements-artistiques',
  'matieres-jouets-et-metamorphoses': 'matieres-et-metamorphoses',
};
