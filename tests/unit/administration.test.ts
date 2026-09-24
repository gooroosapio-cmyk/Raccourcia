import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALERTES_ADMIN } from '@/lib/constants';

/**
 * Ce que la refonte de l'administration promet (rapport, p. 11 et 14), et
 * qu'un ecran d'administration ne permet pas de verifier sans compte.
 */
const lire = (chemin: string) => readFileSync(join(process.cwd(), chemin), 'utf8');

describe('la navigation d’administration', () => {
  const source = lire('components/navigation/admin-nav.tsx');

  it('porte les sept sections, dans l’ordre du rapport', () => {
    const libelles = [
      'Vue d’ensemble',
      'Catalogue',
      'Organisation',
      'Médias',
      'Membres',
      'Statistiques',
      'Paramètres',
    ];
    const positions = libelles.map((libelle) => source.indexOf(`label: '${libelle}'`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('ne parle plus le vocabulaire technique', () => {
    expect(source).not.toContain("label: 'Analytics'");
  });

  it('n’a plus de rangee d’onglets qui defile hors ecran', () => {
    expect(source).not.toContain('overflow-x-auto');
  });
});

describe('les alertes de qualite', () => {
  const requetes = lire('lib/admin/queries.ts');

  it('ne signalent « sans visuel » que les commandes Visuels', () => {
    expect(Object.keys(ALERTES_ADMIN)).toContain('visuel_manquant');
    const bloc = requetes.slice(requetes.indexOf("alerte === 'visuel_manquant'"));
    expect(bloc.slice(0, 300)).toContain("['eq', 'library', 'images']");
  });

  it('ignorent les commandes archivees, dans le filtre comme dans le compte', () => {
    const compte = lire('lib/admin/qualite.ts');
    expect(requetes).toContain("['neq', 'status', 'archived']");
    expect(compte).toContain(".neq('status', 'archived')");
  });
});

describe('la barre de lot', () => {
  const source = lire('components/admin/selection-en-masse.tsx');

  it('n’apparait qu’apres une selection et dit sa portee', () => {
    expect(source).toContain('{visible ? (');
    expect(source).toContain('Portée :');
  });
});
