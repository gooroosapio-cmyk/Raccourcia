import { famillesDeRayon } from '@/lib/catalog/familles-speciales';
import type { LibraryFamily } from '@/lib/catalog/types';

/**
 * A quel rayon appartient chaque collection, par sa position.
 *
 * Une carte connait sa collection, jamais sa famille : la requete du
 * catalogue s'arrete a un niveau. Plutot que d'ajouter une jointure a deux
 * etages a chaque lecture de carte pour un seul glyphe, l'Accueil — qui
 * charge deja la bibliotheque entiere — construit la correspondance une fois
 * et la passe a la galerie.
 *
 * La valeur est une position, pas un nom : c'est elle qui choisit l'icone, et
 * renommer un rayon en administration ne change donc rien au dessin.
 */
export function indexDesRayons(familles: LibraryFamily[]): Record<string, number> {
  const index: Record<string, number> = {};

  famillesDeRayon(familles).forEach((famille, position) => {
    index[famille.slug] = position;
    for (const collection of famille.collections) index[collection.slug] = position;
  });

  return index;
}
