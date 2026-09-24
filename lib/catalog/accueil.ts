import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { CatalogUnavailableError } from '@/lib/catalog/errors';
import { LARGEURS_VISUEL, urlVisuel } from '@/lib/media/url';

/**
 * Ce que l'accueil met en avant.
 *
 * Les collections, et non les categories. Une categorie est un tiroir —
 * « Portraits et photographie » ne fait pas choisir. Une collection est une
 * intention de recherche — « Portrait et editorial », « Liens et
 * souvenirs » —, et c'est a ce niveau-la qu'on sait si ce qu'on cherche est
 * derriere.
 *
 * Le classement vient de la base, pas d'ici : ce que l'administration
 * epingle, ce qui est reellement montrable, puis le volume. Le
 * volume en dernier, sinon l'accueil afficherait chaque jour le plus gros
 * rayon.
 */
export type CollectionPopulaire = {
  slug: string;
  nom: string;
  /** La categorie dont elle releve : « Portraits et photographie ». */
  famille: string;
  /** Combien de commandes publiees s'y trouvent. */
  total: number;
  /** Le visuel d'une de ses commandes. `null` quand aucune n'en a. */
  apercuUrl: string | null;
  /**
   * Ce qu'on trouve derriere, en une phrase, telle que l'administration
   * l'ecrit. `null` pour un rayon qu'elle n'a pas encore decrit — la carte
   * retombe alors sur son compteur.
   */
  description: string | null;
};

export const getCollectionsPopulaires = cache(
  async (limite = 10): Promise<CollectionPopulaire[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('collections_populaires', { p_limite: limite });
    if (error) throw new CatalogUnavailableError(error);

    if (!Array.isArray(data)) return [];

    return (data as unknown[])
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
  },
);
