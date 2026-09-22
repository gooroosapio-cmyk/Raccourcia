import { describe, expect, it } from 'vitest';
import { categoriesDuRayon, resserrerLeRayon } from '@/lib/catalog/rayon';

/**
 * Resserrer une etagere sur une categorie.
 *
 * Le jeu d'essai reprend l'etagere Textes du catalogue : quatre categories,
 * trois collections chacune, plus des tags qui n'en ont aucune. C'est la
 * forme reelle des donnees, et c'est elle qui rend les deux regles
 * necessaires.
 */
const etagereTextes = [
  { cle: 'c-communication', famille: 'Produire un contenu' },
  { cle: 'c-pilotage', famille: 'Produire un contenu' },
  { cle: 'c-documents', famille: 'Produire un contenu' },
  { cle: 'c-sources', famille: 'Analyser et évaluer' },
  { cle: 'c-donnees', famille: 'Analyser et évaluer' },
  { cle: 'c-structure', famille: 'Transformer un contenu' },
  { cle: 'c-memorisation', famille: 'Synthétiser' },
  // Les tags n'ont pas de famille : ils qualifient, ils ne rangent pas.
  { cle: 't-conversation' },
  { cle: 't-redaction' },
];

describe('categoriesDuRayon', () => {
  it('rend chaque categorie une fois', () => {
    expect(categoriesDuRayon(etagereTextes)).toEqual([
      'Produire un contenu',
      'Analyser et évaluer',
      'Transformer un contenu',
      'Synthétiser',
    ]);
  });

  it('garde l ordre du catalogue, jamais l alphabet', () => {
    // « Produire un contenu » pese 116 commandes, « Analyser » 38 : le
    // catalogue les rend dans cet ordre, et la premiere puce est celle
    // qu'on touche sans reflechir.
    const [premiere] = categoriesDuRayon(etagereTextes);
    expect(premiere).toBe('Produire un contenu');
  });

  it('ignore les cartes sans categorie', () => {
    // Une etagere qui n'offrirait que des tags : aucune puce a proposer.
    expect(categoriesDuRayon(etagereTextes.filter((carte) => !carte.famille))).toEqual([]);
  });
});

describe('resserrerLeRayon', () => {
  it('rend tout, tags compris, quand rien n est choisi', () => {
    expect(resserrerLeRayon(etagereTextes, null)).toHaveLength(etagereTextes.length);
  });

  it('ne garde que les collections de la categorie choisie', () => {
    const retenues = resserrerLeRayon(etagereTextes, 'Produire un contenu');
    expect(retenues.map((c) => c.cle)).toEqual(['c-communication', 'c-pilotage', 'c-documents']);
  });

  it('ecarte les tags des qu une categorie est choisie', () => {
    // La regle qui compte : un tag sous un filtre de categorie afficherait
    // des cartes sans rapport avec la categorie demandee, et le filtre
    // paraitrait casse plutot que selectif.
    const retenues = resserrerLeRayon(etagereTextes, 'Synthétiser');
    expect(retenues.every((carte) => carte.famille !== undefined)).toBe(true);
    expect(retenues.map((c) => c.cle)).toEqual(['c-memorisation']);
  });

  it('ne modifie jamais la liste recue', () => {
    const copie = [...etagereTextes];
    resserrerLeRayon(etagereTextes, 'Analyser et évaluer');
    expect(etagereTextes).toEqual(copie);
  });

  it('rend une liste vide pour une categorie inconnue', () => {
    expect(resserrerLeRayon(etagereTextes, 'Inventee')).toEqual([]);
  });
});
