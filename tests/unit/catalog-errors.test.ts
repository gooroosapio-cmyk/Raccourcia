import { describe, expect, it } from 'vitest';
import { CatalogUnavailableError, isCatalogUnavailable } from '@/lib/catalog/errors';

describe('isCatalogUnavailable', () => {
  it('reconnait un incident de catalogue', () => {
    expect(isCatalogUnavailable(new CatalogUnavailableError())).toBe(true);
  });

  it('ignore les autres erreurs', () => {
    expect(isCatalogUnavailable(new Error('autre'))).toBe(false);
    expect(isCatalogUnavailable(null)).toBe(false);
    expect(isCatalogUnavailable('CATALOG_UNAVAILABLE')).toBe(false);
  });

  it('reconnait l erreur meme dupliquee par le bundler', () => {
    // Le graphe serveur et le graphe SSR embarquent chacun leur copie du
    // module : `instanceof` echouait alors, et l'incident remontait jusqu'a
    // un 500 a corps vide. Le marqueur structurel resiste a cette duplication.
    class CopieDuBundler extends Error {
      readonly code = 'CATALOG_UNAVAILABLE';
    }
    const duplicated = new CopieDuBundler();

    expect(duplicated instanceof CatalogUnavailableError).toBe(false);
    expect(isCatalogUnavailable(duplicated)).toBe(true);
  });

  it('conserve la cause pour le journal serveur', () => {
    const cause = { message: 'Host not in allowlist' };
    expect(new CatalogUnavailableError(cause).cause).toBe(cause);
  });
});
