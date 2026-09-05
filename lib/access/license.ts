import 'server-only';

import { createHmac } from 'node:crypto';
import { serverEnv } from '@/lib/env';

/**
 * Forme canonique d'une licence Chariow avant hachage.
 *
 * Les licences sont retapees a la main par des acheteurs : les tirets ne
 * sont qu'un repere visuel (ignores), et O/0 ainsi que I/1 sont
 * indiscernables dans une licence recopiee depuis un email. Les deux cotes
 * (l'empreinte stockee a la reception de license.issued, et la saisie du
 * membre sur /activation) passent par la meme canonicalisation : une
 * confusion de saisie ne doit jamais se traduire par "licence introuvable".
 */
function canonicalizeLicense(license: string): string {
  return license
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/O/g, '0')
    .replace(/I/g, '1');
}

/**
 * Empreinte d'une licence Chariow.
 *
 * La licence n'est jamais stockee en clair (Doc Technique V1, 8.2) : seule
 * cette empreinte HMAC-SHA256, calculee avec un pepper garde en variable
 * d'environnement, est conservee dans purchases.license_fingerprint.
 */
export function fingerprintLicense(license: string): string {
  const normalized = canonicalizeLicense(license);
  return createHmac('sha256', serverEnv().LICENSE_PEPPER).update(normalized).digest('hex');
}

/** Normalisation d'email pour comparaison (la colonne est en citext). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
