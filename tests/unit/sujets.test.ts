import { describe, expect, it } from 'vitest';
import { filtrerParSujet, sujetDeLaCarte } from '@/lib/catalog/sujets';
import type { PromptCard } from '@/lib/catalog/types';

function carte(partiel: Partial<PromptCard>): PromptCard {
  return {
    entityType: 'commande_image',
    witnessType: null,
    ...partiel,
  } as PromptCard;
}

describe('genre de sujet', () => {
  it('reconnait une personne a ce qu’on doit fournir', () => {
    expect(sujetDeLaCarte(carte({ witnessType: 'Une photo nette de la personne' }))).toBe(
      'personnes',
    );
    expect(sujetDeLaCarte(carte({ witnessType: 'Photos des personnes concernées' }))).toBe(
      'personnes',
    );
  });

  it('reconnait un objet', () => {
    expect(sujetDeLaCarte(carte({ witnessType: 'Une photo du produit ou de l’objet' }))).toBe(
      'objets',
    );
  });

  it('range un mode IA quel que soit son temoin', () => {
    expect(sujetDeLaCarte(carte({ entityType: 'mode_ia', witnessType: 'Un brief' }))).toBe('modes');
  });

  it('ne force pas ce qui n’entre dans aucun genre', () => {
    expect(
      sujetDeLaCarte(carte({ witnessType: 'Photo, plan ou dossier de référence' })),
    ).toBeNull();
    expect(sujetDeLaCarte(carte({ witnessType: null }))).toBeNull();
  });

  it('sans genre demande, ne retire rien', () => {
    const cartes = [carte({ witnessType: null }), carte({ witnessType: 'la personne' })];
    expect(filtrerParSujet(cartes, null)).toHaveLength(2);
  });

  it('avec un genre, ne garde que lui', () => {
    const cartes = [
      carte({ witnessType: 'Une photo nette de la personne' }),
      carte({ witnessType: 'Une photo du produit ou de l’objet' }),
      carte({ witnessType: null }),
    ];
    expect(filtrerParSujet(cartes, 'objets')).toHaveLength(1);
  });
});
