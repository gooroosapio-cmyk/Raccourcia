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
 * La vitrine de tete : une rotation entre rayons, pas un tirage.
 *
 * Elle prenait les cartes dans l'ordre du catalogue, ce qui laissait le rayon
 * le plus fourni occuper presque toute la rangee : on croyait decouvrir un
 * catalogue de portraits. Elle tourne maintenant d'un rayon a l'autre —
 * portraits, puis produits, puis effets, puis publicite — et revient au
 * premier quand elle a fait le tour.
 *
 * Les modes IA et les parcours guides sont des rayons comme les autres dans
 * cette rotation. Ils ne sont pas relegues en fin de rangee, ou personne ne
 * pousse : on les rencontre au troisieme ou quatrieme geste.
 *
 * Un rayon epuise sort de la rotation sans laisser de trou. Si un seul reste,
 * la vitrine se remplit avec lui plutot que de s'arreter court — mieux vaut
 * une rangee homogene qu'une rangee de quatre cartes.
 */
export function composerLaVitrine(
  cartes: PromptCard[],
  rayonDeLaCarte: (carte: PromptCard) => string,
  total: number,
): PromptCard[] {
  // Un seau par rayon, dans l'ordre ou les rayons se presentent : la rotation
  // suit l'ordre du catalogue et ne depend d'aucun hasard, donc la vitrine ne
  // bouge pas d'un chargement a l'autre.
  const seaux = new Map<string, PromptCard[]>();
  for (const carte of cartes) {
    const cle = rayonDeLaCarte(carte);
    const seau = seaux.get(cle);
    if (seau) seau.push(carte);
    else seaux.set(cle, [carte]);
  }

  const vitrine: PromptCard[] = [];
  const cles = [...seaux.keys()];
  let tour = 0;

  while (vitrine.length < total) {
    const disponibles = cles.filter((cle) => (seaux.get(cle)?.length ?? 0) > 0);
    if (disponibles.length === 0) break;

    const cle = disponibles[tour % disponibles.length]!;
    const carte = seaux.get(cle)!.shift();
    if (carte) vitrine.push(carte);
    tour += 1;
  }

  return vitrine;
}
