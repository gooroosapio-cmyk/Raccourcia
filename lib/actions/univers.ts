'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';
import { COOKIE_UNIVERS, LIBRARIES } from '@/lib/constants';

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
