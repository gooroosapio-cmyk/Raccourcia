import type { PromptCard } from '@/lib/catalog/types';

/**
 * Ce qu'on fait d'une commande, dit avec le verbe qui convient.
 *
 * « Créer ce visuel » a ete retire, et le libelle du catalogue avec lui.
 * RaccourcIA ne fabrique aucune image : il donne le texte a coller dans une
 * IA qui, elle, la fabrique. Un bouton qui dit « Créer » promet un resultat
 * que le produit ne rend pas, et la deception arrive apres l'achat.
 *
 * Reste ce qui est vrai : on utilise un prompt, on active un mode, on
 * commence un parcours.
 */
export function actionPrincipale(carte: PromptCard): string {
  switch (carte.entityType) {
    case 'mode_ia':
      return 'Activer le mode';
    case 'parcours':
      return 'Commencer le parcours';
    default:
      return 'Utiliser ce prompt';
  }
}

/** Le nom du genre, pour un repere ou une annonce vocale. */
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
 * Le seul repere que porte une carte de galerie.
 *
 * Un, pas trois. Une carte en affichait jusqu'a trois — « 1 photo »,
 * « Format 4:5 », « Parcours guidé » — plus trois logos d'IA : six signes
 * pour une vignette large comme la moitie d'un telephone. Le format est le
 * meme pour les 582 commandes image du catalogue, donc il ne distingue rien ;
 * les IA compatibles se lisent dans la fiche, au moment de choisir.
 *
 * Ce qui reste est ce qui change la decision devant la carte : le genre quand
 * ce n'est pas une image, sinon ce qu'il faudra fournir.
 */
export function repereDeCarte(carte: PromptCard): string | null {
  const genre = nomDuGenre(carte);
  if (genre) return genre;
  if (carte.imagesMin && carte.imagesMin > 0) {
    return carte.imagesMin > 1 ? `${carte.imagesMin} photos` : '1 photo';
  }
  return null;
}

/**
 * Les deux ou trois informations qui aident a decider, dans la fiche.
 *
 * La carte n'en montre plus qu'une ; la fiche a la place de les developper,
 * et c'est la qu'on vient verifier ce qu'il faut fournir avant de se lancer.
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
