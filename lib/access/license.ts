import 'server-only';

import { createHmac } from 'node:crypto';
import { serverEnv } from '@/lib/env';

/**
 * Empreinte d'une licence Chariow.
 *
 * La licence n'est jamais stockee en clair (Doc Technique V1, 8.2) : seule
 * cette empreinte HMAC-SHA256, calculee avec un pepper garde en variable
 * d'environnement, est conservee dans purchases.license_fingerprint.
 */
export function fingerprintLicense(license: string): string {
  const normalized = license.trim().toUpperCase().replace(/\s+/g, '');
  return createHmac('sha256', serverEnv().LICENSE_PEPPER).update(normalized).digest('hex');
}

/** Normalisation d'email pour comparaison (la colonne est en citext). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
