'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * Aimer une commande, ou retirer son like.
 *
 * Distinct du favori. Un favori range une commande pour soi ; un like dit
 * publiquement qu'elle sert. Les confondre reviendrait a publier la
 * bibliotheque privee de chacun.
 *
 * Le compteur n'est pas incremente ici : la base le tient, par un
 * declencheur sur la table des likes. Le calculer cote serveur ouvrirait la
 * porte a deux clics simultanes comptes une seule fois, ou a un compteur qui
 * derive du nombre reel de lignes.
 *
 * Un visiteur non connecte ne peut pas aimer, et la politique de la table le
 * refuse de toute facon. On ne fabrique pas de like anonyme persistant : il
 * faudrait le rattacher a un appareil, ce qui reviendrait a compter les
 * navigateurs plutot que les personnes.
 */
const entree = z.object({
  promptId: z.string().uuid(),
  /** Vrai pour aimer, faux pour retirer. */
  aimer: z.boolean(),
});

export type EtatDuLike =
  { ok: true; aime: boolean; total: number } | { ok: false; raison: 'connexion' | 'erreur' };

export async function basculerLeLike(promptId: string, aimer: boolean): Promise<EtatDuLike> {
  const parse = entree.safeParse({ promptId, aimer });
  if (!parse.success) return { ok: false, raison: 'erreur' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, raison: 'connexion' };

  if (parse.data.aimer) {
    const { error } = await supabase
      .from('prompt_likes')
      .insert({ prompt_id: parse.data.promptId, user_id: user.id });

    // 23505 : deja aime. Deux clics rapides, ou deux onglets — ce n'est pas
    // une erreur, c'est l'etat demande.
    if (error && error.code !== '23505') return { ok: false, raison: 'erreur' };
  } else {
    const { error } = await supabase
      .from('prompt_likes')
      .delete()
      .eq('prompt_id', parse.data.promptId)
      .eq('user_id', user.id);

    if (error) return { ok: false, raison: 'erreur' };
  }

  // Le compte relu depuis la commande, ou le declencheur vient de l'ecrire :
  // l'interface affiche ce que la base sait, jamais son propre calcul.
  const { data } = await supabase
    .from('prompts')
    .select('like_count')
    .eq('id', parse.data.promptId)
    .maybeSingle();

  // Aucune revalidation de route : le cœur bascule dans le composant, et le
  // total revient dans cette reponse. Rafraichir la page a chaque geste
  // redemanderait tout le palier courant au serveur pour ne changer qu'un
  // chiffre — sur un reseau mobile, cela se voit.
  return { ok: true, aime: parse.data.aimer, total: data?.like_count ?? 0 };
}
