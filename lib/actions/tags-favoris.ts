'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Epingler un rayon, ou le decrocher.
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
  slug: z
    .string()
    .min(1)
    .max(120)
    // Le slug vient d'une carte rendue par le serveur, mais il traverse le
    // client : on le revalide a la forme que la base garantit.
    .regex(/^[a-z0-9-]+$/),
  epingler: z.boolean(),
});

export type EtatDuTagFavori =
  { ok: true; epingle: boolean } | { ok: false; raison: 'connexion' | 'introuvable' | 'erreur' };

export async function basculerLeTagFavori(
  slug: string,
  epingler: boolean,
): Promise<EtatDuTagFavori> {
  const parse = entree.safeParse({ slug, epingler });
  if (!parse.success) return { ok: false, raison: 'erreur' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, raison: 'connexion' };

  // Le client ne connait que le slug ; la table garde l'identifiant. La
  // traduction se fait ici, jamais dans le navigateur : envoyer un
  // identifiant de tag dans une adresse en ferait une donnee a valider.
  const { data: tag } = await supabase
    .from('tags')
    .select('id')
    .eq('slug', parse.data.slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!tag) return { ok: false, raison: 'introuvable' };

  if (parse.data.epingler) {
    const { error } = await supabase
      .from('tag_favorites')
      .insert({ tag_id: tag.id, user_id: user.id });

    // 23505 : deja epingle. Deux touches rapides, ou deux onglets — ce
    // n'est pas une erreur, c'est l'etat demande.
    if (error && error.code !== '23505') return { ok: false, raison: 'erreur' };
  } else {
    const { error } = await supabase
      .from('tag_favorites')
      .delete()
      .eq('tag_id', tag.id)
      .eq('user_id', user.id);

    if (error) return { ok: false, raison: 'erreur' };
  }

  return { ok: true, epingle: parse.data.epingler };
}
