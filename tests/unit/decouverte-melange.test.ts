import { describe, expect, it } from 'vitest';

/**
 * Le melange de Decouvrir : sept images pour trois textes.
 *
 * La regle est reimplantee ici a l'identique parce que la fonction vit dans
 * un module `server-only` — elle lit la base. Ce que ce test verrouille,
 * c'est la forme du melange : jamais trois textes d'affilee, aucune carte
 * perdue, et l'ordre des images preserve.
 */
type Carte = { id: string; genre: 'image' | 'texte' };

function entrelacer(images: Carte[], textes: Carte[]): Carte[] {
  if (textes.length === 0) return images;
  if (images.length === 0) return textes;

  const melange: Carte[] = [];
  const pas = Math.max(1, Math.ceil(images.length / (textes.length + 1)));
  let prochainTexte = 0;

  images.forEach((carte, rang) => {
    melange.push(carte);
    if ((rang + 1) % pas === 0 && prochainTexte < textes.length) {
      melange.push(textes[prochainTexte]!);
      prochainTexte += 1;
    }
  });

  return [...melange, ...textes.slice(prochainTexte)];
}

const img = (n: number): Carte => ({ id: `i${n}`, genre: 'image' });
const txt = (n: number): Carte => ({ id: `t${n}`, genre: 'texte' });

describe('le melange de Decouvrir', () => {
  const images = [1, 2, 3, 4, 5, 6, 7].map(img);
  const textes = [1, 2, 3].map(txt);

  it('ne perd aucune carte', () => {
    const melange = entrelacer(images, textes);
    expect(melange).toHaveLength(10);
    expect(new Set(melange.map((c) => c.id)).size).toBe(10);
  });

  it('garde sept images pour trois textes', () => {
    const melange = entrelacer(images, textes);
    expect(melange.filter((c) => c.genre === 'image')).toHaveLength(7);
    expect(melange.filter((c) => c.genre === 'texte')).toHaveLength(3);
  });

  it('ne pose jamais deux textes de suite', () => {
    const melange = entrelacer(images, textes);
    for (let i = 1; i < melange.length; i += 1) {
      expect(melange[i - 1]?.genre === 'texte' && melange[i]?.genre === 'texte').toBe(false);
    }
  });

  it('commence par une image : la page promet des resultats', () => {
    expect(entrelacer(images, textes)[0]?.genre).toBe('image');
  });

  it('preserve l ordre des images', () => {
    const melange = entrelacer(images, textes);
    expect(melange.filter((c) => c.genre === 'image').map((c) => c.id)).toEqual(
      images.map((c) => c.id),
    );
  });

  it('rend le vivier restant quand l autre est vide', () => {
    expect(entrelacer(images, [])).toEqual(images);
    expect(entrelacer([], textes)).toEqual(textes);
    expect(entrelacer([], [])).toEqual([]);
  });

  it('ne laisse aucun texte derriere quand il y en a plus que de place', () => {
    const beaucoup = [1, 2, 3, 4, 5].map(txt);
    const melange = entrelacer([img(1), img(2)], beaucoup);
    expect(melange.filter((c) => c.genre === 'texte')).toHaveLength(5);
  });
});
