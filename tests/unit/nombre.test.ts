import { describe, expect, it } from 'vitest';
import { compteCourt } from '@/lib/format/nombre';

/**
 * Le compteur de likes s'ecrit court sous un cœur : quatre caracteres de
 * large, quelle que soit la valeur. Un compteur qui s'allonge decale le
 * bouton hors de sa zone de frappe.
 */
describe('compteCourt', () => {
  it('rend le nombre tel quel en dessous du millier', () => {
    expect(compteCourt(0)).toBe('0');
    expect(compteCourt(7)).toBe('7');
    expect(compteCourt(999)).toBe('999');
  });

  it('abrege au-dela du millier, avec la virgule francaise', () => {
    expect(compteCourt(1000)).toBe('1 k');
    expect(compteCourt(1200)).toBe('1,2 k');
    expect(compteCourt(12_400)).toBe('12 k');
    expect(compteCourt(999_000)).toBe('999 k');
  });

  it('abrege les millions de la meme facon', () => {
    expect(compteCourt(1_000_000)).toBe('1 M');
    expect(compteCourt(2_350_000)).toBe('2,3 M');
  });

  it('arrondit vers le bas : un compteur social n exagere jamais', () => {
    expect(compteCourt(1290)).toBe('1,2 k');
    expect(compteCourt(1999)).toBe('1,9 k');
  });

  it('ne rend jamais de valeur negative ni decimale', () => {
    expect(compteCourt(-5)).toBe('0');
    expect(compteCourt(3.7)).toBe('3');
  });
});
