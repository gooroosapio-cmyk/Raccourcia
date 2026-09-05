import 'server-only';

import { redirect } from 'next/navigation';
import { getUser, isAdmin } from '@/lib/auth/session';

/**
 * Garde d'entree du back-office.
 *
 * Elle ameliore l'experience mais ne constitue pas la securite : chaque
 * operation sensible revalide le role cote base, via des fonctions
 * `SECURITY DEFINER` qui refusent un appelant non administrateur.
 */
export async function requireAdmin(): Promise<void> {
  const user = await getUser();
  if (!user) redirect('/connexion?suite=/admin');
  if (!(await isAdmin())) redirect('/app');
}

/** Variante pour les Server Actions : leve plutot que de rediriger. */
export async function assertAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("Cette action demande un role d'administration.");
  }
}
