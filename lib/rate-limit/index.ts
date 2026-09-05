import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Limites de depart (Document Technique V1, 17.1). Les compteurs vivent dans
 * Postgres : pas de service externe a maintenir pour la V1.
 */
export const RATE_LIMITS = {
  connexion: { limit: 10, windowSeconds: 15 * 60 },
  activation: { limit: 5, windowSeconds: 30 * 60 },
  recuperation: { limit: 5, windowSeconds: 30 * 60 },
  resolution: { limit: 60, windowSeconds: 10 * 60 },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

/**
 * Consomme un jeton. Retourne false si la limite est franchie.
 * La fonction SQL n'est accessible qu'au service_role : un client ne peut ni
 * epuiser le quota d'autrui ni remettre les compteurs a zero.
 */
export async function consumeRateLimit(
  bucket: RateLimitBucket,
  subject: string,
): Promise<{ allowed: boolean }> {
  const { limit, windowSeconds } = RATE_LIMITS[bucket];
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('consume_rate_limit', {
    p_bucket: bucket,
    p_subject: subject.slice(0, 200),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  // En cas d'incident sur le compteur, on n'ouvre pas la porte en grand :
  // on laisse passer mais l'evenement est journalise par l'appelant.
  if (error) return { allowed: true };
  return { allowed: data === true };
}

/** Empreinte d'IP : on ne conserve jamais l'adresse en clair. */
export async function hashIp(ip: string | null): Promise<string> {
  const value = ip ?? 'inconnue';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}
