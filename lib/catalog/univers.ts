import 'server-only';

import { cookies } from 'next/headers';
import {
  COOKIE_UNIVERS,
  COOKIE_UNIVERS_PREFERE,
  LIBRARIES,
  UNIVERS_PAR_DEFAUT,
  type Library,
} from '@/lib/constants';

export const estUnivers = (valeur: unknown): valeur is Library =>
  LIBRARIES.includes(valeur as Library);

/**
 * L'univers qu'un ecran ouvre, dans cet ordre :
 *   1. celui qu'impose l'adresse (`?univers=`) ;
 *   2. l'univers d'accueil fixe dans Profil, s'il y en a un ;
 *   3. le dernier choisi explicitement ;
 *   4. Visuels, a la premiere visite.
 */
export async function universActif(demande: unknown): Promise<Library> {
  if (estUnivers(demande)) return demande;
  const pot = await cookies();
  const prefere = pot.get(COOKIE_UNIVERS_PREFERE)?.value;
  if (estUnivers(prefere)) return prefere;
  const retenu = pot.get(COOKIE_UNIVERS)?.value;
  if (estUnivers(retenu)) return retenu;
  return UNIVERS_PAR_DEFAUT;
}

/** La preference d'accueil telle que Profil l'affiche. */
export async function preferenceUnivers(): Promise<Library | 'dernier'> {
  const prefere = (await cookies()).get(COOKIE_UNIVERS_PREFERE)?.value;
  return estUnivers(prefere) ? prefere : 'dernier';
}
