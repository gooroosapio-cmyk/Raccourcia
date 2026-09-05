import 'server-only';

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { serverEnv } from '@/lib/env';

/**
 * Verification de signature du Pulse Chariow.
 *
 * Conforme a la specification officielle (chariow.dev, guide "Pulse
 * Security") : l'en-tete `x-chariow-signature` porte
 * `"sha256=" + hex(hmac_sha256(corps_brut, secret_du_pulse))`.
 *
 * Trois details que la specification impose :
 *  - le prefixe litteral `sha256=` fait partie de la valeur comparee ;
 *  - la cle est le secret complet, prefixe `whsec_` inclus : ni decode en
 *    base64, ni ampute de son prefixe ;
 *  - le corps est signe tel qu'il a ete recu, avant tout JSON.parse.
 *
 * Chariow n'envoie pas d'horodatage : la protection contre le rejeu est
 * assuree par l'idempotence de `webhook_events`, pas par une fenetre de
 * validite.
 */
export const CHARIOW_SIGNATURE_HEADER = 'x-chariow-signature';

export function verifyChariowSignature(rawBody: string, headerValue: string | null): boolean {
  const secret = serverEnv().CHARIOW_WEBHOOK_SECRET;
  if (!secret || !headerValue) return false;

  // Le prefixe `sha256=` est signifiant : il fait partie de la valeur envoyee.
  const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
  const expected = Buffer.from(`sha256=${digest}`, 'utf8');
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
