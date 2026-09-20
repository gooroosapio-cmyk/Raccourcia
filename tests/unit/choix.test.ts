import { describe, expect, it } from 'vitest';
import { ecrireLesChoix, lireLesChoix } from '@/lib/admin/choix';

/**
 * Ce que l'administration ecrit dans un champ « liste » decide de ce qui
 * entrera dans le texte copie : la valeur, pas le libelle. Une lecture qui
 * se trompe de colonne fait coller un mot d'interface dans un prompt.
 */
describe('lireLesChoix', () => {
  it('prend le libelle comme valeur quand il n y a pas de barre', () => {
    expect(lireLesChoix('Formel\nDirect')).toEqual([
      { valeur: 'Formel', libelle: 'Formel' },
      { valeur: 'Direct', libelle: 'Direct' },
    ]);
  });

  it('separe la valeur du libelle', () => {
    expect(lireLesChoix('formel | Ton formel')).toEqual([
      { valeur: 'formel', libelle: 'Ton formel' },
    ]);
  });

  it('prend la ligne telle quelle quand la barre ne separe rien', () => {
    expect(lireLesChoix('formel |')).toEqual([{ valeur: 'formel |', libelle: 'formel |' }]);
    expect(lireLesChoix('| Formel')).toEqual([{ valeur: '| Formel', libelle: '| Formel' }]);
  });

  it('ignore les lignes vides et les espaces autour', () => {
    expect(lireLesChoix('  Formel  \n\n   \n  Direct ')).toEqual([
      { valeur: 'Formel', libelle: 'Formel' },
      { valeur: 'Direct', libelle: 'Direct' },
    ]);
  });

  it('ecarte une valeur deja vue : deux lignes identiques dans un menu n en font qu une', () => {
    expect(lireLesChoix('formel | Formel\nformel | Formel bis')).toEqual([
      { valeur: 'formel', libelle: 'Formel' },
    ]);
  });

  it('ne garde que douze choix', () => {
    const lignes = Array.from({ length: 30 }, (_, i) => `choix ${i}`).join('\n');
    expect(lireLesChoix(lignes)).toHaveLength(12);
  });

  it('coupe une valeur trop longue', () => {
    const [choix] = lireLesChoix('a'.repeat(200));
    expect(choix?.valeur).toHaveLength(80);
  });

  it('rend une liste vide pour une saisie vide ou absente', () => {
    expect(lireLesChoix('')).toEqual([]);
    expect(lireLesChoix(null)).toEqual([]);
    expect(lireLesChoix(undefined)).toEqual([]);
  });
});

describe('ecrireLesChoix', () => {
  it('refait exactement ce qui se relit', () => {
    const texte = 'Formel\ndirect | Ton direct';
    expect(ecrireLesChoix(lireLesChoix(texte))).toBe(texte);
  });
});
