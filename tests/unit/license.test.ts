import { beforeAll, describe, expect, it } from 'vitest';
import { fingerprintLicense } from '@/lib/access/license';

// La licence n'est jamais stockee en clair : ces tests verifient uniquement
// que deux saisies humainement equivalentes produisent la meme empreinte.
beforeAll(() => {
  process.env.LICENSE_PEPPER = 'test-pepper-0123456789abcdef0123456789abcdef';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-0123456789';
});

describe('fingerprintLicense', () => {
  it('ignore la casse et les tirets', () => {
    expect(fingerprintLicense('eyhv-1qnx')).toBe(fingerprintLicense('EYHV1QNX'));
  });

  it('normalise la confusion O/0 (licence recopiee a la main)', () => {
    expect(fingerprintLicense('E0HV-1QNX')).toBe(fingerprintLicense('EOHV-1QNX'));
  });

  it('normalise la confusion I/1', () => {
    expect(fingerprintLicense('EYHV-IQNX')).toBe(fingerprintLicense('EYHV-1QNX'));
  });

  it('distingue deux licences reellement differentes', () => {
    expect(fingerprintLicense('AAAA-1111')).not.toBe(fingerprintLicense('BBBB-2222'));
  });
});
