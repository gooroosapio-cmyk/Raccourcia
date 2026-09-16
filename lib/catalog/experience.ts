import type { PromptCard } from '@/lib/catalog/types';

/**
 * Ce qu'on fait d'une carte, dit avec le verbe qui convient.
 *
 * On ne « copie » pas une transformation d'image : on la lance. On n'ouvre
 * pas un mode conversationnel comme une fiche : on l'active. Et un parcours
 * se commence. Le libelle vient du catalogue quand il y est — le classeur le
 * fournit — et retombe sinon sur le verbe du genre.
 *
 * « Copier » reste possible en action secondaire, la ou coller le texte dans
 * son IA est reellement ce que l'on veut faire. Ce n'est plus l'action
 * principale d'une carte image : elle laissait croire que le produit livre
 * un texte, alors qu'il livre un resultat.
 */
export function actionPrincipale(carte: PromptCard): string {
  if (carte.ctaLabel?.trim()) return carte.ctaLabel.trim();

  switch (carte.entityType) {
    case 'mode_ia':
      return 'Activer';
    case 'parcours':
      return 'Commencer';
    case 'commande_image':
      return 'Créer';
    default:
      // Une commande d'un import anterieur : on garde le geste qu'elle avait.
      return 'Voir la commande';
  }
}

/** Le nom du genre, pour un badge ou une annonce vocale. */
export function nomDuGenre(carte: PromptCard): string | null {
  switch (carte.entityType) {
    case 'mode_ia':
      return 'Mode IA';
    case 'parcours':
      return 'Parcours';
    default:
      return null;
  }
}

/**
 * Les deux ou trois informations qui aident a decider, devant une carte.
 *
 * Elles remplacent les trois logos d'IA qui s'affichaient sous chaque carte :
 * trois symboles sans libelle, que personne ne pouvait lire, et qui ne
 * repondaient a aucune question qu'on se pose avant de choisir. Ce qu'on veut
 * savoir, c'est ce qu'il faut fournir et ce qu'on obtient.
 */
export function reperesDeCarte(carte: PromptCard): string[] {
  const reperes: string[] = [];

  if (carte.imagesMin && carte.imagesMin > 0) {
    reperes.push(carte.imagesMin > 1 ? `${carte.imagesMin} photos` : '1 photo');
  }
  if (carte.defaultRatio) reperes.push(`Format ${carte.defaultRatio}`);
  if (carte.entityType === 'parcours') reperes.push('Parcours guidé');

  return reperes.slice(0, 3);
}
