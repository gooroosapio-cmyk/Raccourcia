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
  // Les cinq rayons de cinema n'en font plus qu'un : six affiches, huit
  // personnages et trois ambiances separes donnaient des rayons de trois
  // cartes, qu'on ouvre et dont on ressort aussitot.
  'cinema-personnages-et-scenes': 'cinema',
  'cinema-action-et-espionnage': 'cinema',
  'cinema-sf-et-exploration': 'cinema',
  'cinema-romance-et-comedie': 'cinema',
  'cinema-fantastique-et-mystere': 'cinema',
  // Les quatre rayons editoriaux non plus.
  'editorial-mode-et-beaute': 'editorial',
  'editorial-business-et-parcours': 'editorial',
  'editorial-sport-et-performance': 'editorial',
  'editorial-musique-et-pop-culture': 'editorial',
  'humour-et-scenes-atypiques': 'humour',
  // Les autres n'ont change que de nom.
  'vfx-effets-de-scene': 'effets-de-scene',
  'vfx-espace-et-gravite': 'espace-et-gravite',
  'vfx-lumiere-et-optique': 'lumiere-et-optique',
  'vfx-particules-et-metamorphoses': 'particules-et-metamorphoses',
  'peintres-et-signatures-picturales': 'signatures-picturales',
  'illustration-et-mouvements-artistiques': 'mouvements-artistiques',
  'matieres-jouets-et-metamorphoses': 'matieres-et-metamorphoses',
};
