import type { LibraryFamily } from '@/lib/catalog/types';

/**
 * Les deux familles qui ne sont pas des rayons.
 *
 * Le catalogue compte huit familles, mais deux d'entre elles ne se cherchent
 * pas comme les autres : un Mode IA ouvre une conversation, un Parcours
 * enchaine des livrables. Rangees dans la meme rangee que les portraits,
 * elles passaient pour deux rayons de plus — et personne ne les trouvait.
 *
 * Leurs identifiants viennent du classeur du catalogue et ne changent pas.
 * Tout le reste — nom, description, contenu — continue de venir de la base :
 * ce fichier dit seulement lesquelles se presentent autrement, jamais ce
 * qu'elles contiennent ni dans quel ordre.
 */
export const FAMILLE_MODES_IA = 'modes-ia';
export const FAMILLE_PARCOURS = 'parcours-guides';

const SPECIALES = new Set<string>([FAMILLE_MODES_IA, FAMILLE_PARCOURS]);

/** Vrai pour une famille qui ne se presente pas comme un rayon. */
export function estUneFamilleSpeciale(slug: string): boolean {
  return SPECIALES.has(slug);
}

/** Les familles qui se parcourent comme un rayon, dans l'ordre du catalogue. */
export function famillesDeRayon(familles: LibraryFamily[]): LibraryFamily[] {
  return familles.filter((famille) => !estUneFamilleSpeciale(famille.slug));
}

/**
 * Une famille speciale, si elle est ouverte.
 *
 * `undefined` quand l'administration l'a fermee : l'ecran n'affiche alors pas
 * l'invitation plutot que de mener a une page vide.
 */
export function familleSpeciale(
  familles: LibraryFamily[],
  slug: typeof FAMILLE_MODES_IA | typeof FAMILLE_PARCOURS,
): LibraryFamily | undefined {
  return familles.find((famille) => famille.slug === slug);
}
