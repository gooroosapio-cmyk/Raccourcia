import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { CatalogUnavailableError } from '@/lib/catalog/errors';
import { LARGEURS_VISUEL, urlVisuel } from '@/lib/media/url';
import { TAG_GROUPS, type TagGroup } from '@/lib/constants';

/**
 * Les tags, tels que la Bibliotheque les explore.
 *
 * Rien n'est ecrit ici : ni un tag, ni un groupe, ni un ordre. Poser un tag
 * en administration le fait apparaitre, le retirer le fait disparaitre, et
 * un tag que plus aucune commande ne porte ne s'affiche pas du tout.
 */

export type TagExplorable = {
  slug: string;
  nom: string;
  groupe: TagGroup;
  /** Le visuel du tag, quand l'administration en a depose un. */
  imageUrl: string | null;
  /**
   * Ce qu'on trouve derriere, en une phrase.
   *
   * Un rayon d'Images emprunte le visuel d'une de ses commandes ; un
   * rayon de Textes n'a rien a emprunter, et sa carte se reduisait a deux
   * mots sur un aplat. Une phrase tient cette place mieux qu'un compteur :
   * « 32 commandes » ne dit pas si ce qu'on cherche est derriere.
   */
  description: string | null;
  /** Combien de commandes publiees le portent. */
  total: number;
};

/** Un tag qu'on peut ajouter a la selection, compte sur le croisement. */
export type TagVoisin = { slug: string; nom: string; groupe: TagGroup; total: number };

/** Une famille de tags et les siens, dans l'ordre de la base. */
export type RayonDeTags = { groupe: TagGroup; tags: TagExplorable[] };

/**
 * Tous les tags portes, groupes.
 *
 * Memoise par rendu : la page les lit pour la grille, et l'ecran vide n'a
 * pas a les redemander pour savoir s'il y en avait.
 */
export const getTagsExplorables = cache(async (): Promise<RayonDeTags[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('tags_explorables');
  if (error) throw new CatalogUnavailableError(error);

  const tags = lireLesTags(data);

  // Groupes dans l'ordre de l'enum, et seulement ceux qui portent quelque
  // chose : un intitule suivi du vide se lit comme une panne.
  return TAG_GROUPS.map((groupe) => ({
    groupe,
    tags: tags.filter((tag) => tag.groupe === groupe),
  })).filter((rayon) => rayon.tags.length > 0);
});

/** Un tag precis, ou `null` s'il n'existe pas ou ne porte rien. */
export async function getTag(slug: string): Promise<TagExplorable | null> {
  const rayons = await getTagsExplorables();
  for (const rayon of rayons) {
    const trouve = rayon.tags.find((tag) => tag.slug === slug);
    if (trouve) return trouve;
  }
  return null;
}

/**
 * Ce qu'on peut ajouter a la selection en cours.
 *
 * Le compte est celui du croisement, pas celui du tag seul : proposer
 * « Portrait (484) » a cote de « Vintage » quand les deux ensemble n'en
 * rendent que six serait une impasse annoncee comme une piste.
 */
export async function getTagsVoisins(slugs: string[], limite = 12): Promise<TagVoisin[]> {
  if (slugs.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('tags_voisins', {
    p_tags: slugs,
    p_limite: limite,
  });
  if (error) throw new CatalogUnavailableError(error);

  return lireLesTags(data).map(({ slug, nom, groupe, total }) => ({ slug, nom, groupe, total }));
}

/**
 * Le JSON rendu par la base est relu champ par champ.
 *
 * Un tag mal forme disparait de la grille ; il ne fait pas tomber la page.
 */
function lireLesTags(brut: unknown): TagExplorable[] {
  if (!Array.isArray(brut)) return [];

  return brut
    .filter((entree): entree is Record<string, unknown> => Boolean(entree))
    .map((entree) => {
      const image = typeof entree.image === 'string' && entree.image ? entree.image : null;
      return {
        slug: texte(entree.slug),
        nom: texte(entree.nom),
        groupe: texte(entree.groupe) as TagGroup,
        imageUrl: image ? urlVisuel(image, LARGEURS_VISUEL.vignette) : null,
        description: texte(entree.description) || null,
        total: entier(entree.total),
      };
    })
    .filter(
      (tag) => tag.slug !== '' && tag.nom !== '' && TAG_GROUPS.includes(tag.groupe as TagGroup),
    );
}

function texte(valeur: unknown): string {
  return typeof valeur === 'string' ? valeur : '';
}

function entier(valeur: unknown): number {
  return typeof valeur === 'number' && Number.isFinite(valeur) ? Math.trunc(valeur) : 0;
}
