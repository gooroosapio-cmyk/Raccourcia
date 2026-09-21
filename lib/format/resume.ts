/**
 * Ce qu'une carte ecrit d'une description, et ou elle s'arrete.
 *
 * LE PROBLEME. Les descriptions du catalogue vont de six mots a cent
 * cinquante. Une carte qui les rend telles quelles n'a pas de taille : dans
 * le feed, un mode posé en pleine largeur occupait onze lignes quand son
 * voisin en occupait deux, et la page devenait une suite de blocs de hauteurs
 * differentes sans qu'aucune regle ne l'explique.
 *
 * POURQUOI COUPER LE TEXTE ET PAS SEULEMENT L'AFFICHAGE. Une coupe purement
 * visuelle — `line-clamp` — depend du rendu : elle varie avec la largeur de
 * l'ecran, la taille de police choisie par la personne, et elle tombe
 * entierement des qu'une classe de `display` passe devant. C'est
 * precisement ce qui est arrive. Un nombre de mots, lui, ne depend de rien :
 * la carte porte la meme quantite de texte partout, et le `line-clamp` ne
 * sert plus que de garde-fou.
 *
 * CE QU'ON NE FAIT PAS. On ne coupe pas au caractere : « Construire un test
 * canal mess… » se lit comme un defaut d'affichage. On coupe au mot, et les
 * points de suspension disent que la suite existe — elle est dans la fiche,
 * a un geste de la.
 */

/**
 * Combien de mots une description de carte garde au plus.
 *
 * Seize : deux lignes pleines sur un rectangle couche de 430 px, trois sur
 * une carte de galerie qui fait 42 % d'un telephone. C'est la quantite qui
 * dit ce que la commande fait sans obliger a lire un paragraphe devant une
 * vignette.
 */
export const MOTS_PAR_DESCRIPTION = 16;

/** Ce qui ne doit pas rester colle aux points de suspension. */
const PONCTUATION_DE_FIN = /[\s.,;:!?…«»"'’\-–—]+$/;

/**
 * La description telle qu'une carte l'ecrit.
 *
 * Rend une chaine vide pour une description absente : l'appelant decide s'il
 * reserve la place ou s'il n'affiche rien, et c'est une decision de mise en
 * page, pas de texte.
 */
export function resumerPourCarte(
  texte: string | null | undefined,
  mots = MOTS_PAR_DESCRIPTION,
): string {
  const propre = (texte ?? '').replace(/\s+/g, ' ').trim();
  if (propre === '') return '';

  const decoupe = propre.split(' ');
  if (decoupe.length <= mots) return propre;

  const garde = decoupe.slice(0, mots).join(' ').replace(PONCTUATION_DE_FIN, '');
  // Un resume qui ne garderait que de la ponctuation ne dit rien : mieux vaut
  // alors rendre le texte entier et laisser le garde-fou visuel le couper.
  return garde === '' ? propre : `${garde}…`;
}
