/**
 * Avis affiches sur la page de vente.
 *
 * ---------------------------------------------------------------------------
 * A COMPLETER AVANT PUBLICATION
 *
 * Les personnes sont nommees, les mots doivent donc etre les leurs. Tant que
 * `texte` est vide, la section entiere ne s'affiche pas : mieux vaut une page
 * sans preuve qu'une page avec une preuve fabriquee, qui se retourne contre
 * celui qui la signe le jour ou on lui demande la source.
 *
 * Coller ici le verbatim exact de chaque personne, puis publier.
 * ---------------------------------------------------------------------------
 */
export type Avis = {
  /** Verbatim exact. Vide tant qu'il n'a pas ete recueilli. */
  texte: string;
  auteur: string;
  lieu: string;
  /** Sur cinq. Ne pas arrondir vers le haut. */
  note: number;
};

export const AVIS: Avis[] = [
  { texte: '', auteur: 'Laurence', lieu: 'Abidjan', note: 5 },
  { texte: '', auteur: 'G. Blaise', lieu: 'Abidjan', note: 5 },
  { texte: '', auteur: 'Samson', lieu: 'Dakar', note: 5 },
];

/** Avis reellement publiables : ceux dont on a les mots. */
export function avisPublies(): Avis[] {
  return AVIS.filter((avis) => avis.texte.trim().length > 0);
}
