'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';
import { COOKIE_UNIVERS, COOKIE_UNIVERS_PREFERE, LIBRARIES } from '@/lib/constants';

const univers = z.enum(LIBRARIES);

/**
 * Retient l'univers que le membre vient de choisir, pour la visite suivante.
 *
 * Un cookie pose par le serveur, et non par le navigateur : l'accueil le
 * lit au rendu pour filtrer ses sections des le premier affichage. Une
 * valeur hors des trois univers est ignoree.
 */
export async function retenirUnivers(valeur: string): Promise<void> {
  const choix = univers.safeParse(valeur);
  if (!choix.success) return;
  (await cookies()).set(COOKIE_UNIVERS, choix.data, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: true,
  });
}

const preference = z.union([univers, z.literal('dernier')]);

/**
 * L'univers d'accueil choisi dans Profil. « dernier » retire la preference :
 * l'accueil s'ouvre alors sur le dernier univers choisi.
 */
export async function choisirUniversDAccueil(valeur: string): Promise<{ ok: boolean }> {
  const choix = preference.safeParse(valeur);
  if (!choix.success) return { ok: false };
  const pot = await cookies();
  if (choix.data === 'dernier') {
    pot.delete(COOKIE_UNIVERS_PREFERE);
  } else {
    pot.set(COOKIE_UNIVERS_PREFERE, choix.data, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: true,
    });
  }
  return { ok: true };
}
