/**
 * Les choix d'un champ « liste », tels que l'administration les ecrit.
 *
 * Une ligne par choix. « valeur | Libelle » quand les deux different — la
 * valeur est ce qui entre dans le texte copie, le libelle ce qu'on lit dans
 * le menu. Le libelle seul suffit : la valeur est alors le libelle.
 *
 * Deux barres ou une barre en fin de ligne n'ont pas de sens : la ligne est
 * alors prise telle quelle, plutot que de rendre une valeur vide qu'aucun
 * formulaire ne pourrait proposer.
 */
export type ChoixDeChamp = { valeur: string; libelle: string };

/** Ce qu'une valeur ou un libelle peut peser. Au-dela, la ligne est coupee. */
const LONGUEUR = 80;

/** Douze au plus : au-dela, ce n'est plus un menu mais une recherche. */
const CHOIX_MAX = 12;

export function lireLesChoix(brut: string | null | undefined): ChoixDeChamp[] {
  const lignes = (brut ?? '')
    .split('\n')
    .map((ligne) => ligne.trim())
    .filter(Boolean)
    .slice(0, CHOIX_MAX);

  const vus = new Set<string>();
  const choix: ChoixDeChamp[] = [];

  for (const ligne of lignes) {
    const parts = ligne.split('|').map((part) => part.trim());
    const separe = parts.length > 1 && parts[0] !== '' && parts[1] !== '';

    const valeur = (separe ? parts[0]! : ligne).slice(0, LONGUEUR);
    const libelle = (separe ? parts[1]! : ligne).slice(0, LONGUEUR);

    // Deux fois la meme valeur donnerait deux lignes identiques dans le
    // menu, dont une seule serait jamais retenue.
    if (vus.has(valeur)) continue;
    vus.add(valeur);

    choix.push({ valeur, libelle });
  }

  return choix;
}

/** Le texte du formulaire, refait depuis ce que la base porte. */
export function ecrireLesChoix(choix: ChoixDeChamp[]): string {
  return choix
    .map((entree) =>
      entree.valeur === entree.libelle ? entree.libelle : `${entree.valeur} | ${entree.libelle}`,
    )
    .join('\n');
}
