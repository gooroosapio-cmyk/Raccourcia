'use server';

import { z } from 'zod';
import { getDecouverte } from '@/lib/catalog/decouverte';
import { getPromptDetail } from '@/lib/catalog/queries';
import type { PageDecouverte, PromptCard } from '@/lib/catalog/types';

/**
 * Ce que le feed Decouvrir demande en cours de route.
 *
 * Deux gestes seulement : la suite du defilement, et la fiche d'une
 * commande. Rien d'autre ne transite — le texte d'une commande sort
 * toujours par `resolve_prompt`, jamais par ici.
 */

const marquePage = z.object({ rang: z.number().int(), id: z.string().uuid() }).nullable();

const curseur = z.object({ image: marquePage, texte: marquePage });

/**
 * Le palier suivant.
 *
 * Le curseur vient du client : il est donc valide avant d'entrer dans la
 * requete. Un rang bricole ne peut au pire que deplacer la fenetre de
 * lecture dans un catalogue deja public.
 */
export async function chargerLaSuite(
  image: { rang: number; id: string } | null,
  texte: { rang: number; id: string } | null,
): Promise<PageDecouverte> {
  const parse = curseur.safeParse({ image, texte });
  // Un curseur illisible rend une page vide plutot qu'une erreur : le feed
  // s'arrete, ce qui est exactement ce qu'il ferait au bout de la liste.
  if (!parse.success) return { cartes: [], suite: null };

  return getDecouverte(parse.data);
}

/**
 * La fiche complete d'une commande vue dans le feed.
 *
 * Le feed ne porte que de quoi se dessiner — nom, visuel, tags. Ouvrir la
 * fiche demande les trente champs qui la composent : les embarquer dans
 * chaque carte reviendrait a telecharger tout le catalogue pour en regarder
 * dix cartes.
 */
export async function ouvrirLaFiche(slug: string): Promise<PromptCard | null> {
  const parse = z.string().min(1).max(120).safeParse(slug);
  if (!parse.success) return null;

  return getPromptDetail(parse.data);
}
