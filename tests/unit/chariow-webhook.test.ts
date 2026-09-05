import { createHmac } from 'node:crypto';

// Un secret de Pulse porte toujours le prefixe `whsec_` (specification Chariow).
const SECRET = 'whsec_test0123456789abcdef';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  CHARIOW_SIGNATURE_HEADER,
  deriveExternalEventId,
  scrubChariowPayload,
  verifyChariowSignature,
} from '@/lib/webhooks/chariow';

beforeAll(() => {
  process.env.CHARIOW_WEBHOOK_SECRET = SECRET;
  process.env.LICENSE_PEPPER = 'test-pepper-0123456789abcdef0123456789abcdef';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-0123456789';
});

describe('verifyChariowSignature', () => {
  it('accepte une signature au format sha256=hex du corps brut', () => {
    const body = '{"event":"successful.sale"}';
    const digest = createHmac('sha256', SECRET).update(body).digest('hex');
    expect(verifyChariowSignature(body, `sha256=${digest}`)).toBe(true);
  });

  // Le format sans prefixe etait l'hypothese retenue avant lecture de la
  // specification Chariow : elle rejetait en 401 tout Pulse legitime.
  it('refuse le hex nu, sans le prefixe sha256=', () => {
    const body = '{"event":"successful.sale"}';
    const digest = createHmac('sha256', SECRET).update(body).digest('hex');
    expect(verifyChariowSignature(body, digest)).toBe(false);
  });

  it('tolere les espaces autour de la valeur d en-tete', () => {
    const body = '{"event":"successful.sale"}';
    const digest = createHmac('sha256', SECRET).update(body).digest('hex');
    expect(verifyChariowSignature(body, `  sha256=${digest}  `)).toBe(true);
  });

  // La cle est le secret complet : le prefixe whsec_ n'est ni retire ni
  // decode en base64 (specification Chariow, guide "Pulse Security").
  it('utilise le secret entier comme cle, prefixe whsec_ inclus', () => {
    const body = '{"event":"successful.sale"}';
    const sansPrefixe = createHmac('sha256', SECRET.replace('whsec_', ''))
      .update(body)
      .digest('hex');
    const base64Decode = createHmac('sha256', Buffer.from(SECRET.replace('whsec_', ''), 'base64'))
      .update(body)
      .digest('hex');
    expect(verifyChariowSignature(body, `sha256=${sansPrefixe}`)).toBe(false);
    expect(verifyChariowSignature(body, `sha256=${base64Decode}`)).toBe(false);
  });

  it('refuse une signature incorrecte', () => {
    expect(verifyChariowSignature('{"event":"successful.sale"}', 'signature-invalide')).toBe(false);
  });

  it('refuse un en-tete absent', () => {
    expect(verifyChariowSignature('{"event":"successful.sale"}', null)).toBe(false);
  });

  it('utilise un en-tete nomme de facon coherente', () => {
    expect(CHARIOW_SIGNATURE_HEADER).toBe('x-chariow-signature');
  });
});

describe('deriveExternalEventId', () => {
  it('utilise l identifiant de vente pour successful.sale', () => {
    const id = deriveExternalEventId({ event: 'successful.sale', sale: { id: 'SALE123' } }, '{}');
    expect(id).toBe('sale:SALE123');
  });

  it('utilise l identifiant de licence pour license.issued', () => {
    const id = deriveExternalEventId(
      { event: 'license.issued', license: { id: 'license_abc' } },
      '{}',
    );
    expect(id).toBe('license:license_abc');
  });

  it('retombe sur une empreinte du corps pour un evenement inconnu', () => {
    const id = deriveExternalEventId({ event: 'sale.abandoned' }, '{"event":"sale.abandoned"}');
    expect(id.startsWith('raw:')).toBe(true);
    expect(id).toBe(
      deriveExternalEventId({ event: 'sale.abandoned' }, '{"event":"sale.abandoned"}'),
    );
  });
});

describe('scrubChariowPayload', () => {
  it('retire la licence en clair', () => {
    const scrubbed = scrubChariowPayload({
      event: 'license.issued',
      license: { id: 'license_abc', key: 'EYHV-1QNX' },
    }) as { license: { id: string; key?: string } };

    expect(scrubbed.license.id).toBe('license_abc');
    expect(scrubbed.license.key).toBeUndefined();
  });

  it('retire l URL de checkout, qui porte l email et le telephone en clair', () => {
    const scrubbed = scrubChariowPayload({
      event: 'successful.sale',
      checkout: { url: 'https://x.mychariow.com/checkout?email=a@b.fr&phone=%2B22500' },
    }) as { checkout: { url?: string } };

    expect(scrubbed.checkout.url).toBeUndefined();
  });

  it('laisse le reste du payload intact', () => {
    const scrubbed = scrubChariowPayload({
      event: 'successful.sale',
      sale: { id: 'SALE123', status: 'completed' },
    }) as { sale: { id: string; status: string } };

    expect(scrubbed.sale).toEqual({ id: 'SALE123', status: 'completed' });
  });
});
