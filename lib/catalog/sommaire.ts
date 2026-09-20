import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { CatalogUnavailableError } from '@/lib/catalog/errors';
import { LARGEURS_VISUEL, urlVisuel } from '@/lib/media/url';
import type { CollectionPopulaire } from '@/lib/catalog/accueil';
import type { TagExplorable } from '@/lib/catalog/tags';
import type { Library } from '@/lib/constants';

/**
 * Le sommaire d'une bibliotheque : ses collections et ses tags.
 *
 * Toucher « Images » menait jusqu'ici a l'accueil filtre — mille cartes a
 * la suite. C'est une reponse pour qui sait ce qu'il cherche, et un mur
 * pour qui vient se reperer. Le sommaire repond a l'autre question :
 * qu'est-ce qu'il y a la-dedans ?
 *
 * Deux entrees, et pas trois. Une collection dit ou une commande est
 * rangee, un tag dit de quoi elle parle — ce sont deux chemins differents
 * vers la meme etagere, et l'un ne remplace pas l'autre. La categorie, en
 * revanche, ne sert qu'au classeur : elle n'apparait plus cote membre.
 */
export type SommaireDeBibliotheque = {
  collections: CollectionPopulaire[];
  tags: TagExplorable[];
};

export const getSommaireDeBibliotheque = cache(
  async (library: Library): Promise<SommaireDeBibliotheque> => {
    const supabase = await createClient();

    const [collections, tags] = await Promise.all([
      supabase.rpc('collections_de_bibliotheque', { p_library: library }),
      supabase.rpc('tags_de_bibliotheque', { p_library: library }),
    ]);

    if (collections.error) throw new CatalogUnavailableError(collections.error);
    if (tags.error) throw new CatalogUnavailableError(tags.error);

    return {
      collections: lireLesCollections(collections.data),
      tags: lireLesTags(tags.data),
    };
  },
);

/**
 * Le JSON rendu par la base est relu champ par champ.
 *
 * Une entree mal formee disparait du sommaire ; elle ne fait pas tomber la
 * page. C'est la meme regle que pour les tags de l'accueil : une tuile en
 * moins vaut mieux qu'un ecran d'erreur.
 */
function lireLesCollections(brut: unknown): CollectionPopulaire[] {
  if (!Array.isArray(brut)) return [];

  return (brut as unknown[])
    .filter(
      (entree): entree is Record<string, unknown> =>
        typeof entree === 'object' && entree !== null && !Array.isArray(entree),
    )
    .map((entree) => {
      const apercu = typeof entree.apercu === 'string' && entree.apercu ? entree.apercu : null;
      return {
        slug: typeof entree.slug === 'string' ? entree.slug : '',
        nom: typeof entree.nom === 'string' ? entree.nom : '',
        famille: typeof entree.famille === 'string' ? entree.famille : '',
        total: typeof entree.total === 'number' ? Math.trunc(entree.total) : 0,
        apercuUrl: apercu ? urlVisuel(apercu, LARGEURS_VISUEL.vignette) : null,
        description: typeof entree.description === 'string' ? entree.description : null,
      };
    })
    .filter((collection) => collection.slug !== '' && collection.nom !== '');
}

function lireLesTags(brut: unknown): TagExplorable[] {
  if (!Array.isArray(brut)) return [];

  return (brut as unknown[])
    .filter(
      (entree): entree is Record<string, unknown> =>
        typeof entree === 'object' && entree !== null && !Array.isArray(entree),
    )
    .map((entree) => {
      const image = typeof entree.image === 'string' && entree.image ? entree.image : null;
      return {
        slug: typeof entree.slug === 'string' ? entree.slug : '',
        nom: typeof entree.nom === 'string' ? entree.nom : '',
        groupe: typeof entree.groupe === 'string' ? entree.groupe : '',
        imageUrl: image ? urlVisuel(image, LARGEURS_VISUEL.vignette) : null,
        description: typeof entree.description === 'string' ? entree.description : null,
        total: typeof entree.total === 'number' ? Math.trunc(entree.total) : 0,
      } as TagExplorable;
    })
    .filter((tag) => tag.slug !== '' && tag.nom !== '');
}
