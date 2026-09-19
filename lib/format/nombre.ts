/**
 * Un compteur, ecrit court.
 *
 * Sous un cœur, la place vaut quatre caracteres. « 1 248 » pousse le bouton
 * hors de sa zone de frappe et fait sauter la mise en page d'une carte a
 * l'autre ; « 1,2 k » tient toujours dans la meme largeur.
 *
 * Virgule et non point : c'est la convention francaise, et le reste de
 * l'interface l'emploie deja.
 *
 * L'arrondi se fait vers le bas. Annoncer « 1,3 k » pour 1 250 likes gonfle
 * le chiffre ; un compteur social qui exagere n'est plus un compteur.
 */
export function compteCourt(valeur: number): string {
  const n = Math.max(0, Math.floor(valeur));

  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${decimale(n / 1000)} k`;
  return `${decimale(n / 1_000_000)} M`;
}

/**
 * Une decimale, et seulement si elle apprend quelque chose : « 12 k » plutot
 * que « 12,0 k », mais « 1,2 k » plutot que « 1 k ».
 */
function decimale(valeur: number): string {
  const tronque = Math.floor(valeur * 10) / 10;
  if (tronque >= 10 || Number.isInteger(tronque)) return String(Math.floor(tronque));
  return tronque.toFixed(1).replace('.', ',');
}
