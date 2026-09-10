/**
 * Ce qu'une commande sait faire en plus de son cas principal.
 *
 * La refonte a regroupe cent trente et un raccourcis en modes d'une commande
 * plus large : /eventposter, /promoflyer et /streetposter sont devenus des
 * facons de demander /poster. Le regroupement a du sens — c'est le meme
 * travail — mais il ne se voit nulle part, et quelqu'un qui cherchait une
 * affiche d'evenement n'a aucun moyen de savoir que cette commande la fait.
 *
 * Ces libelles sont donc affiches tels quels : ce sont les titres que
 * portaient les raccourcis absorbes, ecrits pour etre lus.
 */

/** Au-dela, la liste cesse d'informer et devient un mur. */
const MAXIMUM = 8;

type Preset = { mode?: unknown; historical_title?: unknown };

/**
 * Libelles lisibles tires des modes d'une commande.
 *
 * Seul le titre est retenu : le mode technique (« eventposter ») sert a la
 * recherche, pas a l'affichage. Les doublons disparaissent, l'ordre suit
 * l'alphabet — l'ordre d'insertion en base ne veut rien dire pour qui lit.
 */
export function modesLisibles(presets: unknown[]): string[] {
  const titres = new Set<string>();

  for (const brut of presets) {
    if (!brut || typeof brut !== 'object') continue;
    const titre = (brut as Preset).historical_title;
    if (typeof titre === 'string' && titre.trim()) titres.add(titre.trim());
  }

  return [...titres].sort((a, b) => a.localeCompare(b, 'fr')).slice(0, MAXIMUM);
}
