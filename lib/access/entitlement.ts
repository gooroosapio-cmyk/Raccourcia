import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/session';

/**
 * Etat d'acces du compte courant.
 *
 * L'application ne demande jamais "a-t-il paye ?" mais "possede-t-il un droit
 * actif ?" (Blueprint Backend V1, 4.3). L'interface, elle, ne parle jamais
 * d'entitlement : elle dit "acces a vie".
 */
export type AccessState = {
  isMember: boolean;
  hasLifetimeAccess: boolean;
};

export const getAccessState = cache(async (): Promise<AccessState> => {
  const user = await getUser();
  if (!user) return { isMember: false, hasLifetimeAccess: false };

  const supabase = await createClient();
  const { data } = await supabase.rpc('has_active_entitlement');
  return { isMember: true, hasLifetimeAccess: data === true };
});
