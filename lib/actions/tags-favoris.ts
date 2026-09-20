'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Epingler un rayon — un tag ou une collection —, ou le decrocher.
 *
 * L'etoile s'allume tout de suite cote client ; la grille, elle, ne se
 * reordonne qu'a la visite suivante. C'est voulu : une carte qui saute en
 * tete de liste au moment ou le pouce la touche emporte avec elle tout ce
 * qu'on etait en train de lire.
 *
 * Aucune revalidation de route pour la meme raison. Rafraichir la
 * Bibliotheque a chaque etoile redemanderait cinquante cartes au serveur
 * pour ne changer qu'un contour.
 */
const entree = z.object({
  // Un tag et une collection sont deux tables : le genre dit laquelle, et
  // il est ferme — une valeur inventee ne peut atteindre aucune requete.
  genre: z.enum(['tag', 'collection']),
  slug: z
    .string()
    .min(1)
    .max(120)
    // Le slug vient d'une carte rendue par le serveur, mais il traverse le
    // client : on le revalide a la forme que la base garantit.
    .regex(/^[a-z0-9-]+$/),
  epingler: z.boolean(),
});

export type GenreDeRayon = 'tag' | 'collection';

export type EtatDuTagFavori =
  { ok: true; epingle: boolean } | { ok: false; raison: 'connexion' | 'introuvable' | 'erreur' };

export async function basculerLeRayonFavori(
  genre: GenreDeRayon,
  slug: string,
  epingler: boolean,
): Promise<EtatDuTagFavori> {
  const parse = entree.safeParse({ genre, slug, epingler });
  if (!parse.success) return { ok: false, raison: 'erreur' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, raison: 'connexion' };

  // Le client ne connait que le slug ; la table garde l'identifiant. La
  // traduction se fait ici, jamais dans le navigateur : envoyer un
  // identifiant dans une adresse en ferait une donnee a valider.
  const estTag = parse.data.genre === 'tag';

  const { data: rayon } = estTag
    ? await supabase
        .from('tags')
        .select('id')
        .eq('slug', parse.data.slug)
        .eq('is_active', true)
        .maybeSingle()
    : await supabase
        .from('categories')
        .select('id')
        .eq('slug', parse.data.slug)
        .eq('is_visible', true)
        .maybeSingle();

  if (!rayon) return { ok: false, raison: 'introuvable' };

  // Deux branches ecrites en clair plutot qu'un nom de table calcule : le
  // client typé de la base ne sait pas verifier une colonne choisie a
  // l'execution, et une faute de frappe s'y verrait au premier clic d'un
  // membre plutot qu'a la compilation.
  const erreur = estTag
    ? await ecrireLeTag(supabase, rayon.id, user.id, parse.data.epingler)
    : await ecrireLaCollection(supabase, rayon.id, user.id, parse.data.epingler);

  if (erreur) return { ok: false, raison: 'erreur' };
  return { ok: true, epingle: parse.data.epingler };
}

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Pose ou retire une ligne, et rend `true` sur echec reel.
 *
 * 23505 — deja epingle — n'en est pas un : deux touches rapides ou deux
 * onglets aboutissent a l'etat demande.
 */
async function ecrireLeTag(
  supabase: Client,
  tagId: string,
  userId: string,
  epingler: boolean,
): Promise<boolean> {
  if (epingler) {
    const { error } = await supabase
      .from('tag_favorites')
      .insert({ tag_id: tagId, user_id: userId });
    return Boolean(error && error.code !== '23505');
  }
  const { error } = await supabase
    .from('tag_favorites')
    .delete()
    .eq('tag_id', tagId)
    .eq('user_id', userId);
  return Boolean(error);
}

async function ecrireLaCollection(
  supabase: Client,
  categoryId: string,
  userId: string,
  epingler: boolean,
): Promise<boolean> {
  if (epingler) {
    const { error } = await supabase
      .from('category_favorites')
      .insert({ category_id: categoryId, user_id: userId });
    return Boolean(error && error.code !== '23505');
  }
  const { error } = await supabase
    .from('category_favorites')
    .delete()
    .eq('category_id', categoryId)
    .eq('user_id', userId);
  return Boolean(error);
}
