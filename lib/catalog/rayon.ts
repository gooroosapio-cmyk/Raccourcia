/**
 * Resserrer une etagere sur une de ses categories.
 *
 * Les deux regles vivent ici, hors du composant, parce qu'elles se
 * verifient sans navigateur et qu'elles ne parlent que de donnees : quelles
 * categories une etagere propose, et ce qu'il reste quand on en choisit
 * une. Le composant n'a plus qu'a les afficher.
 *
 * `famille` n'est renseignee que pour une collection. Un tag qualifie une
 * commande, il ne la range pas : ce sont deux axes, et c'est cette
 * difference qui decide de tout ce qui suit.
 */

/** Le minimum dont les deux regles ont besoin. */
export type CarteClassable = { famille?: string };

/**
 * Les categories proposees, dans l'ordre ou les cartes arrivent.
 *
 * C'est-a-dire l'ordre du catalogue : la categorie la plus fournie en
 * premier. Un tri alphabetique poserait « Analyser et evaluer » devant
 * « Produire un contenu », qui pese trois fois plus — et la premiere puce
 * est celle qu'on touche sans reflechir.
 */
export function categoriesDuRayon(cartes: readonly CarteClassable[]): string[] {
  const vues: string[] = [];
  for (const carte of cartes) {
    if (carte.famille && !vues.includes(carte.famille)) vues.push(carte.famille);
  }
  return vues;
}

/**
 * Ce que l'etagere montre une fois une categorie choisie.
 *
 * `null` rend tout, tags compris. Une categorie choisie ne rend QUE ses
 * collections : garder les tags reviendrait a afficher, sous un filtre de
 * categorie, des cartes qui n'ont rien a voir avec la categorie demandee —
 * et le filtre paraitrait casse plutot que selectif.
 */
export function resserrerLeRayon<T extends CarteClassable>(
  cartes: readonly T[],
  choisie: string | null,
): T[] {
  if (choisie === null) return [...cartes];
  return cartes.filter((carte) => carte.famille === choisie);
}
