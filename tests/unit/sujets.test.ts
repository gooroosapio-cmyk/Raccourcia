import { describe, expect, it } from 'vitest';
import { appliquerLesFiltres, nombreDeFiltresActifs, sujetDeLaCarte } from '@/lib/catalog/sujets';
import type { PromptCard } from '@/lib/catalog/types';

function carte(partiel: Partial<PromptCard>): PromptCard {
  return {
    entityType: 'commande_image',
    witnessType: null,
    isFree: false,
    ...partiel,
  } as PromptCard;
}

describe('sujet d’une carte', () => {
  it('le lit dans ce qu’il faut fournir', () => {
    expect(sujetDeLaCarte(carte({ witnessType: 'Une photo nette de la personne' }))).toBe(
      'personnes',
    );
    expect(sujetDeLaCarte(carte({ witnessType: 'Une photo du produit ou de l’objet' }))).toBe(
      'objets',
    );
  });

  it('ne force pas ce qui n’entre dans aucun sujet', () => {
    expect(
      sujetDeLaCarte(carte({ witnessType: 'Photo, plan ou dossier de référence' })),
    ).toBeNull();
  });

  it('ne confond plus le format avec le sujet', () => {
    // Un mode IA porte un sujet quand son temoin le dit ; il n'en devient pas
    // un lui-meme.
    const mode = carte({ entityType: 'mode_ia', witnessType: 'Une photo nette de la personne' });
    expect(sujetDeLaCarte(mode)).toBe('personnes');
  });
});

describe('filtres de galerie', () => {
  const cartes = [
    carte({ entityType: 'commande_image', witnessType: 'la personne', isFree: true }),
    carte({ entityType: 'commande_image', witnessType: 'du produit ou de l’objet' }),
    carte({ entityType: 'mode_ia', witnessType: 'Texte, brief ou document' }),
    carte({ entityType: 'parcours', witnessType: null }),
  ];

  it('croise un format et un sujet', () => {
    expect(appliquerLesFiltres(cartes, { format: 'commande_image', sujet: 'objets' })).toHaveLength(
      1,
    );
  });

  it('ne retire rien quand rien n’est demande', () => {
    expect(appliquerLesFiltres(cartes, {})).toHaveLength(4);
  });

  it('separe gratuit et membre', () => {
    expect(appliquerLesFiltres(cartes, { acces: 'gratuit' })).toHaveLength(1);
    expect(appliquerLesFiltres(cartes, { acces: 'membre' })).toHaveLength(3);
  });

  it('compte les filtres actifs', () => {
    expect(nombreDeFiltresActifs({})).toBe(0);
    expect(nombreDeFiltresActifs({ format: 'mode_ia', acces: 'gratuit' })).toBe(2);
  });

  it('traite une carte sans format declare comme une commande', () => {
    const ancienne = carte({ entityType: null });
    expect(appliquerLesFiltres([ancienne], { format: 'commande_image' })).toHaveLength(1);
  });
});
