import { famillesDeRayon } from '@/lib/catalog/familles-speciales';
import type { CollectionTile, LibraryFamily } from '@/lib/catalog/types';

/** Une collection proposee dans la galerie, avec le rayon d'ou elle vient. */
export type SuggestionDeCollection = CollectionTile & { famille: string };

/**
 * Les collections que la galerie propose d'ouvrir, entre deux rangees.
 *
 * Elles sont rares — deux — et choisies, jamais tirees au hasard : la meme
 * galerie doit proposer les memes rayons d'un chargement a l'autre, sinon
 * l'invitation ressemble a une banniere et non a une suggestion.
 *
 * Trois regles, dans cet ordre :
 *
 * 1. **Une couverture reelle.** Une invitation sans apercu ne montre pas ce
 *    qu'elle propose ; autant ne pas interrompre la galerie.
 * 2. **Une collection par famille.** Deux invitations tirees du meme rayon
 *    donneraient l'impression d'un catalogue qui n'a que ca.
 * 3. **La plus fournie d'abord**, puis l'ordre du catalogue. Ouvrir une
 *    collection de trois commandes apres avoir interrompu la galerie est une
 *    promesse mal tenue.
 *
 * Les familles qui ne sont pas des rayons — Modes IA, Parcours guides — n'en
 * sont pas : elles ont leur acces en bibliotheque, ou l'on comprend ce qu'on
 * y trouve.
 */
export function collectionsAProposer(
  familles: LibraryFamily[],
  combien = 2,
): SuggestionDeCollection[] {
  const candidates = famillesDeRayon(familles)
    .map((famille) => {
      const meilleure = famille.collections
        .filter(
          (collection) => collection.apercus.length > 0 && collection.count >= COMBIEN_MINIMUM,
        )
        .sort((a, b) => b.count - a.count)[0];
      return meilleure ? { ...meilleure, famille: famille.name } : null;
    })
    .filter((suggestion): suggestion is SuggestionDeCollection => suggestion !== null);

  return candidates.sort((a, b) => b.count - a.count).slice(0, combien);
}

/**
 * En deca, une collection ne merite pas qu'on interrompe la galerie pour
 * elle : on y entrerait pour en ressortir aussitot.
 */
const COMBIEN_MINIMUM = 4;
