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
 * pose selon la regle qui convient — et elles sont deux, parce qu'un cadre
 * rempli n'est pas toujours un cadre choisi. Voir `visuelDeTag` et
 * `visuelDeCollection`.
 *
 * UN TIRAGE PAR AFFICHAGE. La graine etait l'heure : la grille se
 * renouvelait d'une heure a l'autre et restait identique pour tout le monde
 * pendant ce temps. C'est desormais un tirage par rendu, demande
 * explicitement : une miniature change a chaque actualisation de la page.
 *
 * Ce que cela coute, et c'est assume : deux ouvertures de la meme page ne
 * montrent pas les memes miniatures, et un lien partage ne montre plus ce
 * que l'expediteur avait sous les yeux. Rien de ce qui identifie une carte
 * n'en depend — ni son nom, ni son rayon, ni son adresse — donc ce qui
 * change est un habillage, jamais un contenu.
 *
 * Une graine reste, et n'est pas decorative : elle est tiree UNE fois par
 * rendu et sert a toute la grille. Sans elle, chaque carte tirerait la
 * sienne et deux cartes voisines pourraient montrer la meme image.
 */

/**
 * La graine de ce rendu-ci.
 *
 * Tiree ICI et pas dans un composant : tirer au sort pendant un rendu est
 * impur, et le compilateur React le refuse. Un module de donnees serveur est
 * le bon endroit — c'est deja lui qui parle a la base.
 *
 * Bornee a la plage d'un entier Postgres : `visuels_tournants` prend un
 * `integer`, et un nombre plus grand serait refuse par la base.
 */
function graineDuTirage(): number {
  return Math.floor(Math.random() * 2147483647);
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
    p_graine: graineDuTirage(),
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
 * Le visuel d'un tag : celui qu'on a depose, sinon celui qu'on a tire.
 *
 * L'ordre n'est pas negociable dans ce sens-la. `tags.image_path` est
 * rempli par une personne qui a choisi cette image pour ce tag ; un tirage
 * qui passerait devant rendrait ce geste sans effet un affichage sur deux.
 */
export function visuelDeTag(
  deposee: string | null,
  slug: string,
  tirage: Map<string, string>,
): string | null {
  return deposee ?? tirage.get(`tag:${slug}`) ?? null;
}

/**
 * Le visuel d'une collection : celui qu'on a tire, sinon celui qu'elle prete.
 *
 * L'ORDRE EST L'INVERSE DE CELUI DES TAGS, ET C'EST VOULU. Une collection
 * n'a pas de visuel a elle : `collections_populaires` lui prete celui de sa
 * PREMIERE commande publiee, toujours la meme. Ce cadre-la n'est pas un
 * choix, c'est un emprunt — le laisser gagner revenait a ce qu'aucune tuile
 * de rayon ne change jamais, alors meme que le tirage existait pour cela.
 *
 * L'emprunt reste en second : une collection dont le tirage ne rend rien —
 * la base est muette, ou le rayon n'a qu'une commande — garde une image
 * plutot que de retomber sur un cadre typographique.
 */
export function visuelDeCollection(
  emprunte: string | null,
  slug: string,
  tirage: Map<string, string>,
): string | null {
  return tirage.get(`collection:${slug}`) ?? emprunte ?? null;
}
