import { describe, expect, it } from 'vitest';
import { modesLisibles } from '@/lib/catalog/modes';

describe('modesLisibles', () => {
  it('ne garde que les titres, pas les modes techniques', () => {
    expect(
      modesLisibles([
        { mode: 'eventposter', historical_title: 'Affiche événement' },
        { mode: 'promoflyer', historical_title: 'Flyer promotionnel' },
      ]),
    ).toEqual(['Affiche événement', 'Flyer promotionnel']);
  });

  it('range par ordre alphabetique francais, accents compris', () => {
    expect(
      modesLisibles([
        { historical_title: 'Édition spéciale' },
        { historical_title: 'Affiche food' },
        { historical_title: 'Zoom produit' },
      ]),
    ).toEqual(['Affiche food', 'Édition spéciale', 'Zoom produit']);
  });

  it('supprime les doublons et les entrees vides', () => {
    expect(
      modesLisibles([
        { historical_title: 'Affiche produit' },
        { historical_title: '  Affiche produit  ' },
        { historical_title: '' },
        { mode: 'sansTitre' },
        null,
        'texte libre',
      ]),
    ).toEqual(['Affiche produit']);
  });

  it('s arrete avant de devenir un mur', () => {
    const beaucoup = Array.from({ length: 15 }, (_, i) => ({
      historical_title: `Mode ${String(i).padStart(2, '0')}`,
    }));
    expect(modesLisibles(beaucoup)).toHaveLength(8);
  });

  it('ne rend rien quand la commande n absorbe aucun raccourci', () => {
    expect(modesLisibles([])).toEqual([]);
  });
});
