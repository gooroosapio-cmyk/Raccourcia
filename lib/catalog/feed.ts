import type { PromptCard } from '@/lib/catalog/types';

/**
 * L'ordre du feed de l'Accueil.
 *
 * Il vit hors des requetes, comme l'ordre du catalogue : c'est une regle
 * produit, elle se lit sans base, et un test la verrouille. Une base peut
 * trier par un score ; elle ne sait pas dire « pas deux portraits de suite ».
 *
 * Trois regles, dans cet ordre de priorite :
 *
 * 1. **Jamais deux cartes de la meme collection a la suite.** Un feed qui
 *    enchaine six portraits donne l'impression d'un catalogue de portraits.
 * 2. **Un mode IA ou un parcours regulierement.** Ils sont 110 sur 692 et se
 *    noieraient ; ce sont pourtant les deux experiences qu'on ne decouvre
 *    pas en cherchant une image.
 * 3. **Le poids editorial decide du reste** — mise en avant, puis score du
 *    classeur, puis ordre du catalogue. C'est l'ordre d'arrivee.
 *
 * Ce que la fonction ne fait pas : filtrer. Les cartes sans visuel, masquees
 * ou archivees ne doivent jamais arriver jusqu'ici — c'est la requete qui
 * s'en charge, une seule fois, la ou la base sait le faire.
 */
export function ordonnerLeFeed(
  cartes: PromptCard[],
  { toutesLesNCartes = 4 }: { toutesLesNCartes?: number } = {},
): PromptCard[] {
  const restantes = [...cartes];
  const feed: PromptCard[] = [];
  let depuisUneAutreExperience = 0;

  while (restantes.length > 0) {
    const precedente = feed[feed.length - 1];

    // La place d'un mode IA ou d'un parcours, quand il est temps et qu'il y
    // en a un. Sinon on continue : forcer en creerait une repetition.
    const forcerAutre = depuisUneAutreExperience >= toutesLesNCartes;

    const index =
      (forcerAutre ? trouver(restantes, precedente, (c) => estUneAutreExperience(c)) : -1) >= 0
        ? trouver(restantes, precedente, (c) => estUneAutreExperience(c))
        : trouver(restantes, precedente, () => true);

    // Plus rien qui ne repete la precedente : on prend la suivante telle
    // quelle plutot que de perdre des cartes.
    const choisie = restantes.splice(index >= 0 ? index : 0, 1)[0]!;
    feed.push(choisie);

    depuisUneAutreExperience = estUneAutreExperience(choisie) ? 0 : depuisUneAutreExperience + 1;
  }

  return feed;
}

/** Un mode IA ou un parcours : ce qui n'est pas une transformation d'image. */
function estUneAutreExperience(carte: PromptCard): boolean {
  return carte.entityType === 'mode_ia' || carte.entityType === 'parcours';
}

/**
 * La premiere carte acceptable apres `precedente`, selon un critere.
 *
 * « Acceptable » veut dire : pas la meme collection que la precedente, et pas
 * le meme titre a un mot pres — le catalogue contient des variantes proches
 * (« Portrait studio », « Portrait studio nuit ») qui, cote a cote, donnent
 * l'impression d'un bug.
 */
function trouver(
  restantes: PromptCard[],
  precedente: PromptCard | undefined,
  critere: (carte: PromptCard) => boolean,
): number {
  return restantes.findIndex(
    (carte) =>
      critere(carte) &&
      (!precedente ||
        (carte.collectionSlug !== precedente.collectionSlug &&
          !seRessemblent(carte.name, precedente.name))),
  );
}

/** Deux titres qui ne different que par leur dernier mot. */
function seRessemblent(a: string, b: string): boolean {
  const tronquer = (nom: string) => nom.toLowerCase().split(/\s+/).slice(0, 2).join(' ');
  return tronquer(a) === tronquer(b);
}

/**
 * Un bloc du feed : une grille d'images, ou un module pleine largeur.
 *
 * `cle` sert au rendu ; elle est stable pour une liste donnee, ce qui evite
 * de remonter les blocs a chaque frappe dans un filtre.
 */
export type BlocDuFeed = { cle: string; debut: number; fin: number } & (
  { genre: 'images'; cartes: PromptCard[] } | { genre: 'module'; carte: PromptCard }
);

/** Deux colonnes, deux rangees : un bloc d'images se ferme sur une rangee pleine. */
const PAR_BLOC = 4;

/**
 * Le feed, decoupe en blocs autonomes.
 *
 * Les modes et les parcours etaient poses dans la meme grille que les images,
 * mais en pleine largeur. Une carte large au milieu d'une grille a deux
 * colonnes decale toute la suite d'un cran : on se retrouvait avec une
 * colonne orpheline a gauche, puis a droite, et des trous a chaque module.
 * Pire, l'ordre visuel cessait de suivre l'ordre du document, donc la
 * tabulation sautait d'un bord a l'autre.
 *
 * Chaque bloc est donc autonome : une grille d'images se ferme sur une
 * rangee pleine, puis un module occupe sa propre ligne, puis une nouvelle
 * grille commence. Rien ne se decale, et l'ordre au clavier suit l'ordre a
 * l'oeil.
 *
 * Les modules alternent mode et parcours. Ce sont les deux experiences qu'on
 * ne rencontre jamais en cherchant une image : les laisser dans la masse
 * revenait a ne pas les publier. En alternant, on ne prend pas non plus le
 * visiteur en otage d'un genre.
 *
 * Quand il n'y a plus de module a poser, la grille suivante s'enchaine sans
 * laisser de place reservee : un emplacement vide se lit comme une panne.
 * Et le dernier bloc peut compter moins de quatre cartes — il vaut mieux une
 * rangee incomplete qu'une commande repetee pour boucher le trou.
 *
 * Chaque bloc porte le rang des cartes qu'il pose, de `debut` a `fin`. C'est
 * ce qui permet a l'ecran de placer une invitation apres la huitieme carte
 * reellement affichee, et non apres le huitieme element d'une liste ou les
 * modules comptent aussi — sans quoi chaque invitation glisserait d'un cran
 * a chaque module intercale.
 */
export function decouperLeFeed(cartes: PromptCard[]): BlocDuFeed[] {
  const images = cartes.filter((carte) => !estUneAutreExperience(carte));
  const modes = cartes.filter((carte) => carte.entityType === 'mode_ia');
  const parcours = cartes.filter((carte) => carte.entityType === 'parcours');

  const blocs: BlocDuFeed[] = [];
  let rangImage = 0;
  let rangModule = 0;
  // Combien de cartes ont deja ete posees, modules compris.
  let poses = 0;

  while (rangImage < images.length) {
    const tranche = images.slice(rangImage, rangImage + PAR_BLOC);
    blocs.push({
      genre: 'images',
      cle: `images-${rangImage}`,
      cartes: tranche,
      debut: poses,
      fin: poses + tranche.length,
    });
    poses += tranche.length;
    rangImage += tranche.length;

    // Aucun module apres le dernier bloc : il fermerait la galerie sur autre
    // chose que ce qu'on etait venu voir.
    if (rangImage >= images.length) break;

    // Un mode, puis un parcours, puis un mode : la source qui s'epuise cede
    // son tour plutot que d'interrompre l'alternance.
    const dabord = rangModule % 2 === 0 ? modes : parcours;
    const sinon = rangModule % 2 === 0 ? parcours : modes;
    const carte = dabord.shift() ?? sinon.shift();
    if (carte) {
      blocs.push({
        genre: 'module',
        cle: `module-${carte.id}`,
        carte,
        debut: poses,
        fin: poses + 1,
      });
      poses += 1;
      rangModule += 1;
    }
  }

  return blocs;
}
