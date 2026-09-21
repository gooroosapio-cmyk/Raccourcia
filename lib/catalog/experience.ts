import { lireLesLivrables } from '@/lib/catalog/moteur';
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

/**
 * Ce qu'un Parcours annonce des sa carte : combien de livrables il rend.
 *
 * C'est la seule information qui manquait vraiment devant une carte de
 * parcours. « Un objectif, plusieurs etapes » ne dit pas si l'on s'engage
 * pour deux fichiers ou pour sept, et cette difference decide seule si l'on
 * commence maintenant ou plus tard.
 *
 * Le nombre vient de la liste reellement lue dans le catalogue, jamais d'une
 * estimation : `lireLesLivrables` ne le rend que s'il concorde avec le nombre
 * annonce dans la meme phrase.
 */
export function repereDuMoteur(carte: PromptCard): string | null {
  if (carte.entityType !== 'parcours') return null;

  const plan = lireLesLivrables(carte.moteur?.livrables ?? null);
  if (!plan?.compte) return null;

  return `${plan.compte} livrables`;
}

/**
 * Ce qu'une carte dit de la commande, en une phrase.
 *
 * LA DESCRIPTION D'ABORD, ET L'INTENTION EN DERNIER RECOURS.
 *
 * L'ordre etait l'inverse sur les cartes texte, et il partait d'une idee
 * juste : « l'intention dit ce que la commande cherche a obtenir, la
 * description dit comment elle s'y prend ». La donnee ne suit plus cette
 * idee depuis l'import du moteur V3. `intention` y porte le cadrage
 * complet envoye au moteur — la promesse, puis les garde-fous :
 *
 *   intention          « Jeu de role. Inventaire sante objectifs et
 *                        consequences, hasard explicite. Exactitude des
 *                        noms, dates, chiffres et references. Separer
 *                        faits, hypotheses et propositions. Verifier
 *                        coherence, calculs et fidelite au perimetre... »
 *   short_description  « Aventure fantasy : inventaire sante objectifs et
 *                        consequences, hasard explicite. »
 *
 * La seconde est la carte ; la premiere est la consigne. Sur les 2 121
 * commandes publiees, `intention` fait 209 caracteres en moyenne contre 70
 * pour la description, et **1 431 cartes** ont une intention plus de deux
 * fois plus longue que leur description. Deux cent vingt-neuf repetent mot
 * pour mot la meme clause d'exactitude : une carte sur dix affichait donc
 * le meme paragraphe que sa voisine.
 *
 * Meme coupee a seize mots, l'intention rendait une carte qui commence par
 * repeter son propre titre et finit au milieu d'un garde-fou. La
 * description, elle, tient en une ligne et dit ce qu'on obtient.
 *
 * L'intention reste en dernier recours : quelques commandes n'ont qu'elle,
 * et une carte muette serait pire qu'une carte bavarde.
 *
 * Les cartes image lisaient deja `short_description` en premier. Les deux
 * sortes de cartes disent enfin la meme chose de la meme facon.
 */
export function promesseDeCarte(carte: PromptCard): string {
  return (
    carte.shortDescription?.trim() || carte.resultSummary?.trim() || carte.intention?.trim() || ''
  );
}
