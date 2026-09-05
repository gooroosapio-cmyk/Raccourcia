/**
 * Distingue "ce contenu n'existe pas" de "la base est injoignable".
 *
 * Sans cette distinction, une coupure reseau s'affiche comme un raccourci
 * introuvable ou un catalogue vide : l'utilisateur croit que le contenu a
 * disparu, alors qu'il suffit de reessayer (Spec UX/UI, 17).
 */
export const CATALOG_UNAVAILABLE = 'CATALOG_UNAVAILABLE';

export class CatalogUnavailableError extends Error {
  /**
   * Marqueur structurel plutot qu'un `instanceof`.
   *
   * Le bundler duplique les modules entre le graphe serveur et le graphe SSR :
   * la classe n'a alors pas la meme identite des deux cotes et `instanceof`
   * renvoie faux, ce qui laissait passer l'erreur jusqu'a un 500 vide.
   */
  readonly code = CATALOG_UNAVAILABLE;

  constructor(cause?: unknown) {
    super('Catalogue temporairement injoignable.');
    this.name = 'CatalogUnavailableError';
    this.cause = cause;
  }
}

export function isCatalogUnavailable(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === CATALOG_UNAVAILABLE
  );
}
