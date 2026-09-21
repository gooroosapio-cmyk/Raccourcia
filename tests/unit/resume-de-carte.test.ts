import { describe, expect, it } from 'vitest';
import { MOTS_PAR_DESCRIPTION, resumerPourCarte } from '@/lib/format/resume';

/**
 * La description d'une carte s'arrete a un nombre de mots, pas a un rendu.
 *
 * CE QUE CE TEST PROTEGE. La coupe etait purement visuelle : un `line-clamp`
 * pose a cote d'une classe `display`, qui gagnait sur lui. Resultat, un mode
 * en pleine largeur affichait onze lignes de description et la carte faisait
 * trois fois la hauteur de ses voisines. Une coupe au mot ne depend ni du
 * rendu, ni de la largeur de l'ecran, ni de la taille de police choisie par
 * la personne.
 */
describe('resumerPourCarte', () => {
  const long = Array.from({ length: 40 }, (_, i) => `mot${i + 1}`).join(' ');

  it('laisse une description courte intacte', () => {
    expect(resumerPourCarte('Peser le pour et le contre avant de trancher.')).toBe(
      'Peser le pour et le contre avant de trancher.',
    );
  });

  it('coupe au mot et annonce la suite', () => {
    const resume = resumerPourCarte(long);
    expect(resume.endsWith('…')).toBe(true);
    expect(resume.replace('…', '').split(' ')).toHaveLength(MOTS_PAR_DESCRIPTION);
    // Jamais au milieu d'un mot : « mess… » se lit comme un defaut
    // d'affichage, pas comme une suite qui existe ailleurs.
    expect(resume).toContain(`mot${MOTS_PAR_DESCRIPTION}…`);
  });

  it('ne laisse pas de ponctuation collee aux points de suspension', () => {
    const avecVirgule = `${Array.from({ length: MOTS_PAR_DESCRIPTION }, (_, i) => `mot${i + 1}`).join(' ')}, et la suite`;
    expect(resumerPourCarte(avecVirgule)).toBe(
      `${Array.from({ length: MOTS_PAR_DESCRIPTION }, (_, i) => `mot${i + 1}`).join(' ')}…`,
    );
  });

  it('rend la meme longueur quelle que soit la description', () => {
    const autre = Array.from({ length: 120 }, () => 'texte').join(' ');
    expect(resumerPourCarte(long).split(' ')).toHaveLength(MOTS_PAR_DESCRIPTION);
    expect(resumerPourCarte(autre).split(' ')).toHaveLength(MOTS_PAR_DESCRIPTION);
  });

  it('normalise les espaces et les retours a la ligne du catalogue', () => {
    expect(resumerPourCarte('  Deux\n\nlignes   collees ')).toBe('Deux lignes collees');
  });

  it('rend une chaine vide pour une description absente', () => {
    expect(resumerPourCarte(null)).toBe('');
    expect(resumerPourCarte(undefined)).toBe('');
    expect(resumerPourCarte('   ')).toBe('');
  });
});
