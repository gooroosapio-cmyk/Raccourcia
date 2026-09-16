import { ENTITY_TYPES, type EntityType } from '@/lib/constants';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Deux dimensions, jamais melangees.
 *
 * Le **format** dit ce qu'on manipule : une commande, un mode IA, un parcours
 * guide. Le **sujet** dit sur quoi ca porte : une personne, un objet.
 *
 * Un premier filtre proposait « Personnes / Objets / Modes IA ». Les deux
 * premiers sont des sujets, le troisieme un format : choisir « Modes IA »
 * revenait a repondre a une autre question que celle posee, et il devenait
 * impossible de demander « les modes qui portent sur une personne ». Deux
 * listes separees rendent les deux questions posables ensemble.
 *
 * Le sujet vient de `witness_type` — ce que le catalogue demande de fournir :
 * « Une photo nette de la personne », « Une photo du produit ou de l'objet ».
 * Deux cent trente-cinq commandes attendent une personne, cent quatre-vingt-
 * quatorze un objet. C'est une donnee du classeur, pas une regle ecrite ici.
 *
 * `null` pour ce qui n'entre dans aucun sujet : un brief, un lieu, une image
 * de depart libre. Ces cartes restent dans la galerie et ne disparaissent que
 * lorsqu'un sujet est demande — plutot que d'etre rangees de force.
 */
export const SUJETS = ['personnes', 'objets'] as const;
export type Sujet = (typeof SUJETS)[number];

export const SUJET_LABELS: Record<Sujet, string> = {
  personnes: 'Personnes',
  objets: 'Objets',
};

/** Les formats, dans l'ordre ou on les rencontre. */
export const FORMATS = ENTITY_TYPES;
export type Format = EntityType;

export const FORMAT_LABELS: Record<Format, string> = {
  commande_image: 'Commandes',
  mode_ia: 'Modes IA',
  parcours: 'Parcours guidés',
};

export function sujetDeLaCarte(carte: PromptCard): Sujet | null {
  const temoin = (carte.witnessType ?? '').toLowerCase();
  if (temoin.includes('personne')) return 'personnes';
  if (temoin.includes('produit') || temoin.includes('objet')) return 'objets';
  return null;
}

/** Ce qu'une galerie sait filtrer. Vide veut dire « tout ». */
export type FiltresGalerie = {
  format?: Format;
  sujet?: Sujet;
  acces?: 'gratuit' | 'membre';
};

export function nombreDeFiltresActifs(filtres: FiltresGalerie): number {
  return Object.values(filtres).filter(Boolean).length;
}

export function appliquerLesFiltres(cartes: PromptCard[], filtres: FiltresGalerie): PromptCard[] {
  return cartes.filter((carte) => {
    // Une carte d'un import anterieur au catalogue V2 n'a pas de format
    // declare : elle compte comme une commande, ce qu'elle est.
    const format = carte.entityType ?? 'commande_image';
    if (filtres.format && format !== filtres.format) return false;
    if (filtres.sujet && sujetDeLaCarte(carte) !== filtres.sujet) return false;
    if (filtres.acces === 'gratuit' && !carte.isFree) return false;
    if (filtres.acces === 'membre' && carte.isFree) return false;
    return true;
  });
}
