import 'server-only';

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { serverEnv } from '@/lib/env';

/**
 * Verification de signature du Pulse Chariow.
 *
 * A CONFIRMER AVANT MISE EN PRODUCTION : le nom exact de l'en-tete et
 * l'algorithme de signature n'ont pas ete verifies contre la documentation
 * Chariow (chariow.dev et help.chariow.com sont hors de portee reseau
 * depuis cet environnement de developpement). Cette implementation part de
 * la convention la plus repandue pour ce type d'integration (HMAC-SHA256
 * du corps brut, en hexadecimal, cle = secret du Pulse) : verifier ce
 * detail dans le tableau de bord Chariow (Developpeur > Pulses > ce Pulse)
 * ou via l'envoi d'un evenement de test, et ajuster SIGNATURE_HEADER et le
 * calcul ci-dessous si necessaire.
 */
export const CHARIOW_SIGNATURE_HEADER = 'x-chariow-signature';

export function verifyChariowSignature(rawBody: string, headerValue: string | null): boolean {
  const secret = serverEnv().CHARIOW_WEBHOOK_SECRET;
  if (!secret || !headerValue) return false;

  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'), 'utf8');
  const provided = Buffer.from(headerValue.trim(), 'utf8');
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

/**
 * Identifiant stable pour l'idempotence, par type d'evenement connu.
 * A defaut d'identifiant metier (evenement non encore gere), on retombe sur
 * une empreinte du corps brut : un rejeu identique reste deduplique.
 */
export function deriveExternalEventId(payload: Record<string, unknown>, rawBody: string): string {
  if (payload.event === 'successful.sale') {
    const sale = payload.sale as { id?: unknown } | undefined;
    if (typeof sale?.id === 'string') return `sale:${sale.id}`;
  }
  if (payload.event === 'license.issued') {
    const license = payload.license as { id?: unknown } | undefined;
    if (typeof license?.id === 'string') return `license:${license.id}`;
  }
  return `raw:${createHash('sha256').update(rawBody).digest('hex')}`;
}

/**
 * Retire du payload journalise ce qui ne doit jamais atteindre un journal en
 * clair : la licence elle-meme (seule son empreinte est stockee ailleurs) et
 * l'URL de checkout, qui porte l'email et le telephone de l'acheteur dans sa
 * chaine de requete.
 */
export function scrubChariowPayload(payload: unknown): unknown {
  if (typeof payload !== 'object' || payload === null) return payload;

  const clone = structuredClone(payload) as Record<string, unknown>;

  const license = clone.license;
  if (typeof license === 'object' && license !== null) {
    delete (license as Record<string, unknown>).key;
  }

  const checkout = clone.checkout;
  if (typeof checkout === 'object' && checkout !== null) {
    delete (checkout as Record<string, unknown>).url;
  }

  return clone;
}
