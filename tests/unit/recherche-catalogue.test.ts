import { describe, expect, it } from 'vitest';
import { normaliserRecherche, portesDeRecherche } from '@/lib/catalog/recherche';

describe('normaliserRecherche', () => {
  it('rapproche les accents, la casse et la ponctuation', () => {
    expect(normaliserRecherche('Éclaté')).toBe('eclate');
    expect(normaliserRecherche("d'usage")).toBe('d usage');
    expect(normaliserRecherche('  /adSocial  ')).toBe('adsocial');
  });

  it('ne laisse ni espace en trop ni chaine vide inattendue', () => {
    expect(normaliserRecherche('***')).toBe('');
    expect(normaliserRecherche('a -- b')).toBe('a b');
  });
});

describe('portesDeRecherche', () => {
  it('interroge le texte de la commande et les noms qu elle a portes', () => {
    const portes = portesDeRecherche('adsocial', []);

    expect(portes).toContain('search_norm.ilike.%adsocial%');
    // La porte de la refonte : sans elle, quelqu'un qui tape le nom qu'il a
    // garde en tete tombe sur une page vide.
    expect(portes).toContain('search_aliases.ilike.%adsocial%');
  });

  it('n ajoute la famille que lorsqu une famille correspond', () => {
    expect(portesDeRecherche('portrait', [])).not.toContain('category_id');

    const portes = portesDeRecherche('portrait', ['id-1', 'id-2']);
    expect(portes).toContain('category_id.in.(id-1,id-2)');
  });

  it('separe les portes comme PostgREST les attend', () => {
    expect(portesDeRecherche('x', ['f'])).toBe(
      'search_norm.ilike.%x%,search_aliases.ilike.%x%,category_id.in.(f)',
    );
  });
});
