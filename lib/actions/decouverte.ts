'use server';

import { z } from 'zod';
import { getAccessState } from '@/lib/access/entitlement';
import { getDecouverte } from '@/lib/catalog/decouverte';
import { getPromptDetail } from '@/lib/catalog/queries';
import type { CurseurDecouverte, PageDecouverte, PromptCard } from '@/lib/catalog/types';

/**
 * Ce que le feed Decouvrir demande en cours de route.
 *
 * Deux gestes seulement : la suite du defilement, et la fiche d'une
 * commande. Rien d'autre ne transite — le texte d'une commande sort
 * toujours par `resolve_prompt`, jamais par ici.
 */

const curseur = z.object({ rang: z.number().int(), id: z.string().uuid() });

/**
 * Le palier suivant.
 *
 * Le curseur vient du client : il est donc valide avant d'entrer dans la
 * requete. Un rang bricole ne peut au pire que deplacer la fenetre de
 * lecture dans un catalogue deja public.
 */
export async function chargerLaSuite(depuis: CurseurDecouverte): Promise<PageDecouverte> {
  const parse = curseur.safeParse(depuis);
  // Un curseur illisible rend une page vide plutot qu'une erreur : le feed
  // s'arrete, ce qui est exactement ce qu'il ferait au bout de la liste.
  if (!parse.success) return { cartes: [], suite: null };

  // LE DROIT SE RELIT ICI, IL NE VOYAGE PAS DEPUIS LE CLIENT. Le premier
  // palier est rendu au serveur avec le droit du moment ; les suivants
  // arrivent par cette action, et un drapeau envoye par le navigateur
  // serait un drapeau qu'on peut retourner. On redemande donc l'acces.
  const acces = await getAccessState();

  return getDecouverte(parse.data, { offertesSeulement: !acces.hasFullAccess });
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
