import { describe, expect, it } from 'vitest';
import { lireTousLesPaliers, PALIER_DE_LECTURE } from '@/lib/catalog/paliers';
import { isCatalogUnavailable } from '@/lib/catalog/errors';

/**
 * La lecture par paliers, verifiee sans Postgres.
 *
 * CE QUE CE TEST PROTEGE. PostgREST s'arrete a mille lignes sans le dire.
 * Une lecture d'un bloc rendait donc, pour un catalogue de deux mille
 * commandes, un comptage faux — et comme les mille premieres commandes du
 * catalogue sont toutes des images, les rayons de Textes et de Reflexions
 * comptaient zero et leurs pages repondaient « Page introuvable ».
 *
 * Le piege est le second : croire que le palier demande est le palier servi.
 * Un serveur qui plafonne plus bas rend moins de lignes que demande ; avancer
 * de la taille demandee sauterait alors tout ce qui se trouve entre les deux.
 * C'est le scenario « plafond serveur plus bas » ci-dessous, et c'est lui qui
 * echoue si quelqu'un remplace l'avancee par un simple `debut += TAILLE`.
 */

/** Une base en memoire, qui repond comme PostgREST : bornee, silencieuse. */
function base(lignes: number, plafondServeur = PALIER_DE_LECTURE) {
  const tout = Array.from({ length: lignes }, (_, i) => ({ id: i }));
  const appels: [number, number][] = [];

  const lire = (debut: number, fin: number) => {
    appels.push([debut, fin]);
    const demande = fin - debut + 1;
    const servi = Math.min(demande, plafondServeur);
    return Promise.resolve({ data: tout.slice(debut, debut + servi), error: null });
  };

  return { lire, appels, tout };
}

describe('lireTousLesPaliers', () => {
  it('rend toutes les lignes quand il y en a plus qu un palier', async () => {
    const { lire } = base(2877);
    const lues = await lireTousLesPaliers(lire);
    expect(lues).toHaveLength(2877);
    expect(lues.map((l) => l.id)).toEqual([...Array(2877).keys()]);
  });

  it('ne saute rien quand le serveur plafonne plus bas que le palier demande', async () => {
    const { lire } = base(2877, 500);
    const lues = await lireTousLesPaliers(lire);
    // Six paliers de 500 plus un de 377, et aucune ligne perdue au passage.
    expect(lues).toHaveLength(2877);
    expect(new Set(lues.map((l) => l.id)).size).toBe(2877);
  });

  it('s arrete sur un palier vide, pas sur un palier incomplet', async () => {
    const { lire, appels } = base(1000);
    const lues = await lireTousLesPaliers(lire);
    expect(lues).toHaveLength(1000);
    // Un palier plein, puis un palier vide qui dit que c'est fini.
    expect(appels).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('ne demande rien de plus quand la table est vide', async () => {
    const { lire, appels } = base(0);
    expect(await lireTousLesPaliers(lire)).toEqual([]);
    expect(appels).toHaveLength(1);
  });

  it('leve plutot que de rendre un comptage tronque', async () => {
    let tour = 0;
    const lire = (debut: number, fin: number) => {
      tour += 1;
      if (tour === 2) return Promise.resolve({ data: null, error: { message: 'coupure' } });
      return Promise.resolve({
        data: Array.from({ length: fin - debut + 1 }, (_, i) => ({ id: debut + i })),
        error: null,
      });
    };

    await expect(lireTousLesPaliers(lire)).rejects.toSatisfy(isCatalogUnavailable);
  });

  it('ne tourne pas indefiniment si le serveur ne s arrete jamais', async () => {
    // Une base sans fin : sans garde-fou, la boucle ne rendrait jamais la main.
    const sansFin = (debut: number, fin: number) =>
      Promise.resolve({
        data: Array.from({ length: fin - debut + 1 }, (_, i) => ({ id: debut + i })),
        error: null,
      });

    const lues = await lireTousLesPaliers(sansFin);
    expect(lues.length).toBe(50 * PALIER_DE_LECTURE);
  });
});
