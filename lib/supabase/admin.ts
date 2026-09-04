import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { publicEnv, serverEnv } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Client service_role : CONTOURNE LA RLS.
 *
 * Usage autorise uniquement pour :
 *  - le webhook Chariow (creation purchase/entitlement),
 *  - les operations d'administration deja verifiees cote serveur,
 *  - la resolution de payload apres controle complet des droits.
 *
 * Toute utilisation doit etre precedee d'une verification d'autorisation
 * explicite. Ne jamais importer ce module depuis un composant client.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    publicEnv().NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
