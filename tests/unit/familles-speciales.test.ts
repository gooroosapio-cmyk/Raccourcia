import { describe, expect, it } from 'vitest';
import {
  FAMILLE_MODES_IA,
  FAMILLE_PARCOURS,
  famillesDeRayon,
  familleSpeciale,
} from '@/lib/catalog/familles-speciales';
import type { LibraryFamily } from '@/lib/catalog/types';

function famille(slug: string): LibraryFamily {
  return {
    id: slug,
    slug,
    name: slug,
    description: '',
    mode: 'image',
    count: 1,
    apercus: [],
    collections: [],
  };
}

describe('familles speciales', () => {
  it('ecarte les modes IA et les parcours des rayons', () => {
    const familles = [
      famille('portraits'),
      famille(FAMILLE_MODES_IA),
      famille('publicite'),
      famille(FAMILLE_PARCOURS),
    ];

    expect(famillesDeRayon(familles).map((f) => f.slug)).toEqual(['portraits', 'publicite']);
  });

  it('conserve l’ordre du catalogue', () => {
    const familles = [famille('c'), famille('a'), famille('b')];

    expect(famillesDeRayon(familles).map((f) => f.slug)).toEqual(['c', 'a', 'b']);
  });

  it('ne renvoie rien quand la famille est fermee', () => {
    expect(familleSpeciale([famille('portraits')], FAMILLE_MODES_IA)).toBeUndefined();
  });

  it('retrouve une famille speciale ouverte', () => {
    const modes = famille(FAMILLE_MODES_IA);

    expect(familleSpeciale([famille('portraits'), modes], FAMILLE_MODES_IA)).toBe(modes);
  });
});
