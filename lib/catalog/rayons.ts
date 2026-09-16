import { famillesDeRayon } from '@/lib/catalog/familles-speciales';
import { iconeDeLaFamille } from '@/lib/ui/icones';
import type { LibraryFamily } from '@/lib/catalog/types';

/**
 * Le trait de la famille de chaque collection, par slug.
 *
 * Meme raison que ci-dessus : une carte connait sa collection, jamais sa
 * famille, et l'ecran qui charge deja la bibliotheque etablit la
 * correspondance une fois.
 *
 * Le dessin arrive tout fait plutot que d'etre resolu par la carte. Les
 * soixante-douze traits du kit vivent dans un seul objet : y toucher depuis
 * une carte — qui est un composant client — les ferait tous entrer dans le
 * navigateur, une trentaine de kilo-octets pour en dessiner six.
 *
 * Il se resout par le slug de la famille, non plus par sa position. La
 * position marchait tant qu'un seul ecran s'en servait ; des que le rail de
 * l'Accueil est passe aux traits du kit, le meme rayon pouvait porter deux
 * dessins differents a deux endroits de la meme page — et reordonner le
 * catalogue en administration les rebattait tous.
 */
export function traitsDesRayons(familles: LibraryFamily[]): Record<string, string> {
  const traits: Record<string, string> = {};

  for (const famille of famillesDeRayon(familles)) {
    const trait = iconeDeLaFamille(famille.slug);
    if (!trait) continue;
    traits[famille.slug] = trait;
    for (const collection of famille.collections) traits[collection.slug] = trait;
  }

  return traits;
}
