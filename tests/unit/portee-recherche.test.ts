import { describe, expect, it } from 'vitest';
import { porteeDeRecherche } from '@/lib/catalog/recherche';

/**
 * La portee d'une recherche est une decision produit, pas un detail de
 * requete : c'est elle qui fait la difference entre « aucun resultat » et
 * « la commande existe, deux rayons plus loin ».
 */
describe('porteeDeRecherche', () => {
  it('reste dans le domaine tant que rien n’est cherche', () => {
    expect(porteeDeRecherche({})).toBe('domaine');
    expect(porteeDeRecherche({ familleChoisie: 'epoques' })).toBe('domaine');
  });

  it('traverse le catalogue des qu’on cherche sans avoir choisi de famille', () => {
    expect(porteeDeRecherche({ recherche: 'logo' })).toBe('catalogue');
  });

  it('respecte la famille choisie : l’ecran dit ou l’on cherche', () => {
    expect(porteeDeRecherche({ recherche: 'logo', familleChoisie: 'epoques' })).toBe('domaine');
  });

  it('ne confond pas une chaine vide avec une recherche', () => {
    expect(porteeDeRecherche({ recherche: '' })).toBe('domaine');
  });
});
