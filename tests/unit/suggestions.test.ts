import { describe, expect, it } from 'vitest';
import { collectionsAProposer } from '@/lib/catalog/suggestions';
import { FAMILLE_MODES_IA } from '@/lib/catalog/familles-speciales';
import type { CollectionTile, LibraryFamily } from '@/lib/catalog/types';

function collection(slug: string, count: number, apercus: string[] = ['a.jpg']): CollectionTile {
  return { id: slug, slug, name: slug, count, apercus };
}

function famille(slug: string, collections: CollectionTile[]): LibraryFamily {
  return {
    id: slug,
    slug,
    name: slug,
    description: '',
    mode: 'image',
    count: collections.reduce((total, c) => total + c.count, 0),
    apercus: [],
    collections,
  };
}

describe('collections a proposer', () => {
  it('ecarte celles qui n’ont aucun apercu', () => {
    const familles = [
      famille('a', [collection('sans', 40, []), collection('avec', 10)]),
      famille('b', [collection('autre', 12)]),
    ];

    expect(collectionsAProposer(familles).map((s) => s.slug)).toEqual(['autre', 'avec']);
  });

  it('ne propose jamais deux collections du meme rayon', () => {
    const familles = [
      famille('a', [collection('grosse', 40), collection('moyenne', 30)]),
      famille('b', [collection('petite', 8)]),
    ];

    expect(collectionsAProposer(familles).map((s) => s.slug)).toEqual(['grosse', 'petite']);
  });

  it('ecarte les familles qui ne sont pas des rayons', () => {
    const familles = [
      famille(FAMILLE_MODES_IA, [collection('modes', 80)]),
      famille('a', [collection('images', 20)]),
    ];

    expect(collectionsAProposer(familles).map((s) => s.slug)).toEqual(['images']);
  });

  it('ecarte une collection trop maigre pour interrompre la galerie', () => {
    const familles = [famille('a', [collection('maigre', 3)])];

    expect(collectionsAProposer(familles)).toEqual([]);
  });

  it('donne le rayon d’ou vient la collection', () => {
    const familles = [famille('Portraits', [collection('epoques', 23)])];

    expect(collectionsAProposer(familles)[0]?.famille).toBe('Portraits');
  });
});
