import { describe, expect, it } from 'vitest';
import { ordonnerLeFeed } from '@/lib/catalog/feed';
import type { PromptCard } from '@/lib/catalog/types';

/** Une carte reduite a ce dont l'ordre du feed a besoin. */
function carte(
  id: string,
  collectionSlug: string,
  entityType: PromptCard['entityType'] = 'commande_image',
  name = id,
): PromptCard {
  return { id, name, collectionSlug, entityType } as unknown as PromptCard;
}

describe('ordonnerLeFeed', () => {
  it('ne rend jamais deux cartes du meme rayon a la suite', () => {
    const feed = ordonnerLeFeed([
      carte('a', 'portraits'),
      carte('b', 'portraits'),
      carte('c', 'produits'),
      carte('d', 'portraits'),
      carte('e', 'produits'),
    ]);

    for (let i = 1; i < feed.length; i += 1) {
      expect(feed[i]!.collectionSlug).not.toBe(feed[i - 1]!.collectionSlug);
    }
  });

  it('ne perd aucune carte', () => {
    const entree = [
      carte('a', 'portraits'),
      carte('b', 'portraits'),
      carte('c', 'portraits'),
      carte('d', 'produits'),
    ];
    const feed = ordonnerLeFeed(entree);
    expect(feed).toHaveLength(entree.length);
    expect(new Set(feed.map((c) => c.id))).toEqual(new Set(entree.map((c) => c.id)));
  });

  it('glisse un mode IA ou un parcours au bout de quelques cartes', () => {
    const cartes = [
      ...Array.from({ length: 8 }, (_, i) => carte(`img${i}`, `rayon${i}`)),
      carte('mode', 'modes', 'mode_ia'),
      carte('parcours', 'parcours', 'parcours'),
    ];
    const feed = ordonnerLeFeed(cartes, { toutesLesNCartes: 3 });

    // Les deux autres experiences remontent dans les premieres cartes plutot
    // que de rester au fond, la ou personne ne descend.
    const positions = feed
      .map((c, i) => ({ type: c.entityType, i }))
      .filter((x) => x.type !== 'commande_image')
      .map((x) => x.i);
    expect(positions[0]).toBeLessThanOrEqual(4);
  });

  it('separe deux variantes dont le titre ne differe que par la fin', () => {
    const feed = ordonnerLeFeed([
      carte('a', 'r1', 'commande_image', 'Portrait studio'),
      carte('b', 'r2', 'commande_image', 'Portrait studio nuit'),
      carte('c', 'r3', 'commande_image', 'Packshot blanc'),
    ]);
    const titres = feed.map((c) => c.name);
    expect(titres.indexOf('Portrait studio nuit')).not.toBe(titres.indexOf('Portrait studio') + 1);
  });

  it('rend une liste vide sans broncher', () => {
    expect(ordonnerLeFeed([])).toEqual([]);
  });
});
