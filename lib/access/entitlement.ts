import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getUser, isAdmin } from '@/lib/auth/session';

/**
 * Etat d'acces du compte courant.
 *
 * L'application ne demande jamais "a-t-il paye ?" mais "possede-t-il un droit
 * actif ?" (Blueprint Backend V1, 4.3). L'interface, elle, ne parle jamais
 * d'entitlement : elle dit "acces a vie".
 */
export type AccessState = {
  /** Faux pour un visiteur : personne n'est connecte. */
  isMember: boolean;
  hasLifetimeAccess: boolean;
  isAdmin: boolean;
  /**
   * Vrai quand l'interface ne doit ni verrouiller une commande, ni proposer
   * l'offre.
   *
   * L'acces a vie l'ouvre, le role d'administration aussi : un compte de
   * l'equipe n'a pas d'entitlement — il n'a rien achete — et se voyait donc
   * traite comme un prospect, cartes floutees et fenetre d'offre toutes les
   * quarante-cinq secondes, jusque dans le back-office qu'il venait
   * d'utiliser pour publier ces memes commandes.
   */
  hasFullAccess: boolean;
};

const VISITEUR: AccessState = {
  isMember: false,
  hasLifetimeAccess: false,
  isAdmin: false,
  hasFullAccess: false,
};

export const getAccessState = cache(async (): Promise<AccessState> => {
  const user = await getUser();
  if (!user) return VISITEUR;

  const supabase = await createClient();
  const [{ data }, administrateur] = await Promise.all([
    supabase.rpc('has_active_entitlement'),
    isAdmin(),
  ]);

  const hasLifetimeAccess = data === true;
  return {
    isMember: true,
    hasLifetimeAccess,
    isAdmin: administrateur,
    hasFullAccess: hasLifetimeAccess || administrateur,
  };
});
