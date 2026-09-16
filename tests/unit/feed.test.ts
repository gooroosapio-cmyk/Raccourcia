import { describe, expect, it } from 'vitest';
import { decouperLeFeed, ordonnerLeFeed } from '@/lib/catalog/feed';
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

describe('découpage du feed en blocs', () => {
  // Chaque carte dans son propre rayon : le decoupage ne doit dependre que du
  // genre, jamais de l'ordre qui l'a precede.
  const image = (n: number) => carte(`i${n}`, `rayon-${n}`);
  const mode = (n: number) => carte(`m${n}`, `modes-${n}`, 'mode_ia');
  const parcours = (n: number) => carte(`p${n}`, `parcours-${n}`, 'parcours');
  const images = (combien: number) => Array.from({ length: combien }, (_, n) => image(n));
  const tailles = (blocs: ReturnType<typeof decouperLeFeed>) =>
    blocs.filter((bloc) => bloc.genre === 'images').map((bloc) => bloc.cartes.length);
  const modules = (blocs: ReturnType<typeof decouperLeFeed>) =>
    blocs.flatMap((bloc) => (bloc.genre === 'module' ? [bloc.carte.id] : []));

  it('ferme chaque grille sur une rangée pleine', () => {
    expect(tailles(decouperLeFeed([...images(8), mode(1)]))).toEqual([4, 4]);
  });

  it('pose un module entre deux grilles, jamais à la fin', () => {
    const blocs = decouperLeFeed([...images(8), mode(1)]);
    expect(blocs.map((bloc) => bloc.genre)).toEqual(['images', 'module', 'images']);
  });

  it('alterne mode et parcours', () => {
    const blocs = decouperLeFeed([...images(12), mode(1), mode(2), parcours(1)]);
    expect(modules(blocs)).toEqual(['m1', 'p1']);
  });

  it('cède le tour quand un genre est épuisé plutôt que d’interrompre', () => {
    const blocs = decouperLeFeed([...images(12), mode(1), mode(2)]);
    expect(modules(blocs)).toEqual(['m1', 'm2']);
  });

  it('ne réserve pas de place quand il n’y a plus de module', () => {
    const blocs = decouperLeFeed(images(12));
    expect(blocs.map((bloc) => bloc.genre)).toEqual(['images', 'images', 'images']);
  });

  it('laisse la dernière rangée incomplète plutôt que de répéter une carte', () => {
    expect(tailles(decouperLeFeed(images(6)))).toEqual([4, 2]);
  });

  it('ne perd et ne duplique aucune image', () => {
    const blocs = decouperLeFeed(images(23));
    const rendues = blocs.flatMap((bloc) => (bloc.genre === 'images' ? bloc.cartes : []));
    expect(rendues).toHaveLength(23);
    expect(new Set(rendues.map((c) => c.id)).size).toBe(23);
  });

  it('n’insère aucun module dans une liste filtrée sur les images', () => {
    // Ce qui arrive quand le filtre « Commandes » est actif : la liste ne
    // contient plus de mode ni de parcours, donc plus rien a intercaler.
    const blocs = decouperLeFeed(images(9));
    expect(modules(blocs)).toEqual([]);
  });
});

describe('rang des cartes dans les blocs', () => {
  const image = (n: number) => carte(`i${n}`, `rayon-${n}`);
  const mode = (n: number) => carte(`m${n}`, `modes-${n}`, 'mode_ia');
  const images = (combien: number) => Array.from({ length: combien }, (_, n) => image(n));

  it('compte les cartes affichées, modules compris, sans trou ni recouvrement', () => {
    // C'est ce rang qui place une invitation « après la huitième carte ».
    // Compter les elements de la liste la ferait glisser a chaque module.
    const blocs = decouperLeFeed([...images(10), mode(1)]);
    expect(blocs.map((bloc) => [bloc.debut, bloc.fin])).toEqual([
      [0, 4],
      [4, 5],
      [5, 9],
      [9, 11],
    ]);
  });

  it('démarre à zéro et finit sur le total affiché', () => {
    const blocs = decouperLeFeed([...images(9), mode(1)]);
    expect(blocs[0]?.debut).toBe(0);
    expect(blocs[blocs.length - 1]?.fin).toBe(10);
  });
});
