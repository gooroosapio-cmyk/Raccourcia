import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Les listes de colonnes envoyees a PostgREST, relues comme du texte.
 *
 * POURQUOI CE TEST EXISTE. La suite d'integration parle a Postgres en
 * direct ; elle ne traverse jamais PostgREST. Une faute dans une liste de
 * colonnes lui est donc parfaitement invisible — et c'est exactement ce
 * qui est arrive : `getPromptDetail` embarquait `categories` deux fois
 * dans un meme select, une fois par `CARD_COLUMNS` et une fois a la main.
 * PostgREST rejette la requete, la fonction levait, et les deux seuls
 * ecrans qui l'appellent rendaient une erreur : le bouton de Decouvrir et
 * les pages de partage. Pendant des semaines.
 *
 * Le test lit le fichier source plutot que d'appeler la fonction : il n'y
 * a pas de base ici, et ce qu'on veut verrouiller est justement la CHAINE
 * envoyee, pas son resultat.
 *
 * Il ne remplace pas un vrai appel a PostgREST. Il attrape la faute qui a
 * coute cher, et celle-la seulement.
 */
const source = readFileSync(join(process.cwd(), 'lib/catalog/queries.ts'), 'utf8');

/** Les tables embarquees d'une liste de colonnes : `nom(...)`. */
function relationsEmbarquees(selection: string): string[] {
  // On ne descend pas dans les embarquements imbriques — `tags(...)` dans
  // `prompt_tags(...)` est une relation de `prompt_tags`, pas de `prompts`.
  const relations: string[] = [];
  let profondeur = 0;
  let mot = '';

  for (const caractere of selection) {
    if (caractere === '(') {
      if (profondeur === 0 && mot.trim()) {
        // Le nom peut porter un modificateur : `prompt_media!inner`.
        relations.push(mot.trim().split('!')[0]!.replace(/^,\s*/, '').trim());
      }
      profondeur += 1;
      mot = '';
      continue;
    }
    if (caractere === ')') {
      profondeur -= 1;
      mot = '';
      continue;
    }
    if (profondeur === 0) {
      mot = caractere === ',' || caractere === '\n' ? '' : mot + caractere;
    }
  }

  return relations;
}

describe('les selects PostgREST du catalogue', () => {
  it('n embarque jamais deux fois la meme relation dans CARD_COLUMNS', () => {
    const bloc = source.match(/const CARD_COLUMNS = `([\s\S]*?)`/);
    expect(bloc, 'CARD_COLUMNS introuvable').not.toBeNull();

    const relations = relationsEmbarquees(bloc![1]!);
    expect(relations.length).toBeGreaterThan(0);
    expect(new Set(relations).size).toBe(relations.length);
  });

  it('ne rajoute jamais une relation que CARD_COLUMNS porte deja', () => {
    const bloc = source.match(/const CARD_COLUMNS = `([\s\S]*?)`/);
    const deja = new Set(relationsEmbarquees(bloc![1]!));

    // Tous les selects qui etendent CARD_COLUMNS, avec ce qu'ils ajoutent.
    const etendus = [...source.matchAll(/\$\{CARD_COLUMNS\}([^`]*)`/g)].map((m) => m[1]!);
    expect(etendus.length).toBeGreaterThan(0);

    for (const ajout of etendus) {
      for (const relation of relationsEmbarquees(ajout)) {
        expect(
          deja.has(relation),
          `« ${relation} » est deja embarquee par CARD_COLUMNS : PostgREST refuse le select.`,
        ).toBe(false);
      }
    }
  });
});
