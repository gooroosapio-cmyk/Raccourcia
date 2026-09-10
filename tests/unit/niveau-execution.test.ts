import { describe, expect, it } from 'vitest';
import { decrireNiveau } from '@/lib/catalog/niveau';

describe('decrireNiveau', () => {
  it('ne dit rien d une commande que le catalogue n a pas encore graduee', () => {
    expect(decrireNiveau(null, 2)).toBeNull();
  });

  it('annonce un plafond, jamais une certitude', () => {
    expect(decrireNiveau('A', 0)?.attente).toContain('Aucune question');
    expect(decrireNiveau('B', 1)?.attente).toContain('au plus');
    expect(decrireNiveau('C', 3)?.attente).toContain('trois questions');
  });

  it('traite l absence de plafond comme aucune question', () => {
    expect(decrireNiveau('A', null)?.attente).toContain('Aucune question');
  });

  it('ne signale comme mission que les niveaux qui en sont une', () => {
    expect(decrireNiveau('A', 0)?.mission).toBe(false);
    expect(decrireNiveau('B', 1)?.mission).toBe(false);
    expect(decrireNiveau('C', 2)?.mission).toBe(false);
    expect(decrireNiveau('D', 2)?.mission).toBe(true);
    expect(decrireNiveau('E', 3)?.mission).toBe(true);
  });

  it('reprend le libelle du vocabulaire central', () => {
    expect(decrireNiveau('A', 0)?.titre).toBe('Résultat immédiat');
    expect(decrireNiveau('E', 3)?.titre).toBe('Accompagnement complet');
  });
});
