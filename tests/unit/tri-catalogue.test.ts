import { describe, expect, it } from 'vitest';
import { clesDeTri } from '@/lib/catalog/tri';

const colonnes = (sort: 'populaires' | 'nouveaux' | 'alpha', isMember: boolean) =>
  clesDeTri(sort, isMember).map((cle) => cle.colonne);

describe('ordre du catalogue', () => {
  it('montre au visiteur ce qu il peut copier avant tout le reste', () => {
    expect(colonnes('populaires', false)[0]).toBe('is_free');
  });

  it('rend son ordre au catalogue des qu un compte est connecte', () => {
    expect(colonnes('populaires', true)).not.toContain('is_free');
    expect(colonnes('populaires', true)[0]).toBe('media_ready');
  });

  it('range les cartes sans visuel en queue, puis l etoile, puis les nouveautes', () => {
    const cles = colonnes('populaires', true);
    expect(cles.slice(0, 3)).toEqual(['media_ready', 'is_pinned', 'is_new']);
    expect(
      clesDeTri('populaires', true)
        .slice(0, 3)
        .every((cle) => !cle.ascendant),
    ).toBe(true);
  });

  it('garde ces regles pour un visiteur, apres la cle des commandes offertes', () => {
    expect(colonnes('populaires', false).slice(0, 4)).toEqual([
      'is_free',
      'media_ready',
      'is_pinned',
      'is_new',
    ]);
  });

  it('termine toujours par une cle unique, sans quoi la pagination repete des cartes', () => {
    for (const sort of ['populaires', 'nouveaux', 'alpha'] as const) {
      for (const isMember of [true, false]) {
        expect(colonnes(sort, isMember).at(-1)).toBe('command');
      }
    }
  });

  it('applique le tri demande', () => {
    expect(colonnes('alpha', true)).toContain('name');
    expect(colonnes('nouveaux', true)).toContain('published_at');
    expect(colonnes('populaires', true)).toContain('sort_order');
  });

  it('ne place jamais deux fois la meme colonne', () => {
    for (const sort of ['populaires', 'nouveaux', 'alpha'] as const) {
      for (const isMember of [true, false]) {
        const cles = colonnes(sort, isMember);
        expect(new Set(cles).size).toBe(cles.length);
      }
    }
  });
});
