import type { PromptCard } from '@/lib/catalog/types';

/**
 * Sur quoi porte une commande : une personne, un objet, ou une conversation.
 *
 * Ce n'est pas le rayon. « Art & effets » contient autant de portraits
 * transformes que d'objets metamorphoses, et « Photos produit » ne contient
 * que des objets : trier par rayon melangerait les deux dans un cas et
 * dupliquerait l'information dans l'autre.
 *
 * C'est `witness_type` qui le dit — ce que le catalogue demande de fournir :
 * « Une photo nette de la personne », « Une photo du produit ou de l'objet ».
 * Deux cent trente-cinq commandes attendent une personne, cent quatre-vingt-
 * quatorze un objet. C'est la seule donnee qui distingue reellement les deux,
 * et elle vient du classeur, pas d'une regle ecrite ici.
 *
 * `null` pour ce qui n'entre dans aucune des trois : un brief, un lieu, une
 * image de depart libre. Ces commandes restent dans la galerie et
 * disparaissent seulement quand un genre est demande — plutot que d'etre
 * rangees de force dans un tiroir qui ne leur va pas.
 */
export const SUJETS = ['personnes', 'objets', 'modes'] as const;
export type Sujet = (typeof SUJETS)[number];

export const SUJET_LABELS: Record<Sujet, string> = {
  personnes: 'Personnes',
  objets: 'Objets',
  modes: 'Modes IA',
};

export function sujetDeLaCarte(carte: PromptCard): Sujet | null {
  if (carte.entityType === 'mode_ia') return 'modes';

  const temoin = (carte.witnessType ?? '').toLowerCase();
  if (temoin.includes('personne')) return 'personnes';
  if (temoin.includes('produit') || temoin.includes('objet')) return 'objets';

  return null;
}

/** Les cartes d'un genre, ou toutes quand aucun n'est demande. */
export function filtrerParSujet(cartes: PromptCard[], sujet: Sujet | null): PromptCard[] {
  if (!sujet) return cartes;
  return cartes.filter((carte) => sujetDeLaCarte(carte) === sujet);
}
