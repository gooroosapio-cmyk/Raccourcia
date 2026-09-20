import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { LARGEURS_VISUEL, urlVisuel } from '@/lib/media/url';

/**
 * Le visuel d'une carte de rayon, quand l'administration n'en a pas pose.
 *
 * LE PROBLEME. La Bibliotheque montre des cartes illustrees. Un tag n'a
 * d'image que si quelqu'un l'a deposee — c'est le cas d'une minorite —, et
 * une collection emprunte l'apercu de sa PREMIERE commande, toujours la
 * meme. La grille avait donc deux defauts a la fois : des cadres vides, et
 * des cadres qui ne changent jamais.
 *
 * CE QUE FAIT CE MODULE. Il demande a la base un visuel tire au sort dans
 * le dossier de chaque tag et de chaque collection, puis l'application le
 * pose SOUS le visuel declare : ce que l'administration a choisi gagne
 * toujours, le tirage ne sert qu'a remplir les vides.
 *
 * POURQUOI UNE GRAINE PLUTOT QUE `random()`. Un tirage vraiment aleatoire
 * changerait a chaque requete : la meme page rendue deux fois de suite
 * n'aurait pas les memes images, le cache ne vaudrait plus rien, et un lien
 * partage ne montrerait pas ce que l'expediteur a vu. La graine est
 * l'heure : la grille se renouvelle d'une heure a l'autre, et reste
 * identique pour tout le monde pendant cette heure.
 */

/** Ce qui identifie une entree du tirage : `tag:portrait`, `collection:liens`. */
export type CleDeVisuel = `tag:${string}` | `collection:${string}`;

/**
 * L'heure courante, en numero.
 *
 * Calculee ICI et pas dans un composant : lire l'horloge pendant un rendu
 * est impur, et le compilateur React le refuse. Un module de donnees
 * serveur est le bon endroit — c'est deja lui qui parle a la base.
 */
function graineDuMoment(): number {
  return Math.floor(Date.now() / (60 * 60 * 1000));
}

/**
 * Le tirage du moment, memoise par rendu.
 *
 * Un appel pour toute la page : la Bibliotheque pose jusqu'a cinquante
 * cartes, et cinquante demandes d'un visuel chacune seraient cinquante
 * allers-retours sur un reseau mobile.
 *
 * Une panne ici ne fait pas tomber l'ecran : on rend une table vide, et
 * les cartes retombent sur leur motif. Un rayon sans image reste un rayon.
 */
export const getVisuelsTournants = cache(async (): Promise<Map<string, string>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('visuels_tournants', {
    p_graine: graineDuMoment(),
  });

  if (error || typeof data !== 'object' || data === null || Array.isArray(data)) {
    return new Map();
  }

  const tirage = new Map<string, string>();
  for (const [cle, chemin] of Object.entries(data as Record<string, unknown>)) {
    if (typeof chemin === 'string' && chemin !== '') {
      tirage.set(cle, urlVisuel(chemin, LARGEURS_VISUEL.vignette));
    }
  }
  return tirage;
});

/**
 * Le visuel a montrer : celui qu'on a choisi, sinon celui qu'on a tire.
 *
 * L'ordre n'est pas negociable. Une administration qui depose une image sur
 * un tag attend de la voir ; un tirage qui passerait devant rendrait ce
 * geste sans effet une heure sur deux.
 */
export function visuelDeCarte(
  declare: string | null,
  cle: CleDeVisuel,
  tirage: Map<string, string>,
): string | null {
  return declare ?? tirage.get(cle) ?? null;
}
