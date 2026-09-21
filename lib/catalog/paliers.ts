import { CatalogUnavailableError } from '@/lib/catalog/errors';

/**
 * Lire une table entiere, palier par palier.
 *
 * POURQUOI CE MODULE EXISTE. PostgREST s'arrete a mille lignes par defaut,
 * **sans rien dire** : la reponse est valide, simplement tronquee. Une
 * lecture qui rapatrie tout le catalogue pour le compter rend donc des
 * totaux faux des que le catalogue depasse mille commandes — et c'est
 * exactement ce qui est arrive a la Bibliotheque.
 *
 * Le defaut ne se voyait pas, parce qu'il etait trie. Les mille premieres
 * commandes dans l'ordre du catalogue sont toutes des images : les rayons de
 * Textes et de Reflexions comptaient donc zero commande, leur famille tombait
 * au filtre « une famille sans rien a montrer n'a pas de tuile », et leurs
 * collections rendaient « Page introuvable ». Le sommaire, lui, continuait de
 * les proposer — il vient d'une fonction SQL, qui ne tronque pas. Deux
 * lectures du meme catalogue ne disaient plus la meme chose, et la
 * navigation menait a une page qui n'existait que pour l'une des deux.
 *
 * Ce module ne parle pas a la base : il recoit une fonction qui lit un
 * intervalle. C'est ce qui le rend verifiable sans Postgres, et c'est aussi
 * ce qui permet de le poser sur n'importe quelle lecture.
 */

/**
 * Combien de lignes on demande d'un coup.
 *
 * Mille : c'est le plafond que PostgREST applique par defaut, donc la plus
 * grande demande qui puisse etre servie entiere.
 */
export const PALIER_DE_LECTURE = 1000;

/**
 * Un garde-fou, pas une limite de travail.
 *
 * Il arrete une boucle qui ne se terminerait pas — un serveur qui rendrait
 * indefiniment des lignes. A deux mille neuf cents commandes, le catalogue
 * en est a trois paliers : le plafond ne se voit pas.
 */
export const PALIERS_AU_PLUS = 50;

/** Ce que rend une lecture d'intervalle, cote PostgREST. */
export type LotLu<T> = { data: T[] | null; error: { message: string } | null };

/**
 * ON AVANCE DU NOMBRE RECU, JAMAIS DE LA TAILLE DEMANDEE.
 *
 * Si le serveur plafonne plus bas que notre palier, avancer de la taille
 * demandee sauterait les lignes intermediaires — et la troncature reviendrait
 * par la fenetre, en silence encore une fois. Pour la meme raison on s'arrete
 * sur un palier vide, et non sur un palier incomplet : un palier incomplet
 * peut n'etre qu'un plafond serveur plus bas que le notre.
 *
 * L'APPELANT DOIT FOURNIR UN ORDRE TOTAL. Un tri qui laisse des ex aequo n'a
 * pas de decoupe stable : la meme ligne peut alors revenir deux fois ou ne
 * jamais venir. En pratique, un critere metier puis l'identifiant.
 *
 * Une erreur leve plutot que de rendre ce qui a deja ete lu : un comptage
 * tronque par une erreur avalee est la forme la plus discrete de la faute que
 * ce module repare.
 */
export async function lireTousLesPaliers<T>(
  palier: (debut: number, fin: number) => PromiseLike<LotLu<T>>,
): Promise<T[]> {
  const toutes: T[] = [];
  let debut = 0;

  for (let tour = 0; tour < PALIERS_AU_PLUS; tour += 1) {
    const { data, error } = await palier(debut, debut + PALIER_DE_LECTURE - 1);
    if (error) throw new CatalogUnavailableError(error);

    const lot = data ?? [];
    if (lot.length === 0) return toutes;

    toutes.push(...lot);
    debut += lot.length;
  }

  return toutes;
}
