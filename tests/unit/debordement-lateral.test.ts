import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';

/**
 * L'ecran est fige horizontalement, et il doit le rester.
 *
 * POURQUOI CE TEST EXISTE. Le meme defaut est revenu trois fois :
 * l'interface entiere parquee quarante pixels a droite, titres coupes au
 * bord gauche, et aucun geste pour revenir — la page n'a pas de barre de
 * defilement laterale, donc rien a ramener.
 *
 * Deux causes, deux regles a tenir, et aucune des deux ne se voit dans une
 * relecture de diff :
 *
 *   1. `overflow-x: hidden` ne fige pas. Il fait de l'element un conteneur
 *      de defilement dont on masque la barre : le focus, l'aimantation,
 *      `scrollIntoView` et la restauration de position peuvent encore
 *      deplacer le contenu. Seul `clip` supprime la position laterale.
 *
 *   2. Un rail qui sort des marges avec une valeur ECRITE EN DUR finit par
 *      diverger de la marge reelle de la coquille. Celle-ci vaut 16 px
 *      sous 360 px ; un rail en `-mx-5` en sortait de 20 et elargissait le
 *      document de huit pixels. Huit pixels ne se voient pas — une page
 *      qui glisse, si.
 *
 * Le test lit les fichiers comme du texte : il n'y a pas de navigateur
 * ici, et ce qu'on veut verrouiller est justement la REGLE ecrite.
 */
const racine = process.cwd();
const css = readFileSync(join(racine, 'app/globals.css'), 'utf8');

describe('le gel horizontal de l’écran', () => {
  it('fige la page avec `clip`, jamais avec `hidden`', () => {
    // `html, body` apparait plusieurs fois — police, fond, puis le gel.
    // On cherche le bloc qui porte la regle, pas le premier venu.
    const blocs = [...css.matchAll(/html,\s*\nbody\s*\{([^}]*)\}/g)].map((m) => m[1]!);
    expect(blocs.length, 'la règle « html, body » est introuvable').toBeGreaterThan(0);

    const gel = blocs.find((bloc) => bloc.includes('overflow-x'));
    expect(gel, 'aucune règle « html, body » ne fige l’axe horizontal').toBeDefined();
    expect(gel!).toContain('overflow-x: clip');
    expect(gel!).toContain('overscroll-behavior-x: none');
  });

  it('ne laisse aucun `overflow-x: hidden` sur la racine ni sur le corps', () => {
    // `hidden` ailleurs — dans une carte, dans une fiche — reste legitime :
    // c'est la racine du document qui ne doit pas devenir defilante.
    const surLaRacine = /(?:^|\n)(?:html|body)[^{]*\{[^}]*overflow-x:\s*hidden/.test(css);
    expect(surLaRacine, '`overflow-x: hidden` est revenu sur html ou body').toBe(false);
  });

  it('déclare la marge de coquille en variable', () => {
    expect(css).toContain('--marge-coquille');
    expect(css).toContain('.pleine-largeur');
    // La coquille clippe elle aussi : second verrou sous celui de `html`.
    expect(css).toMatch(/\.coquille\s*\{[^}]*overflow-x:\s*clip/);
  });
});

describe('les rails de la coquille membre', () => {
  /**
   * Toutes les coquilles, y compris l'administration.
   *
   * On avait d'abord exclu l'administration — « ce n'est pas un ecran
   * membre ». C'est un ecran, il se consulte au telephone, et il glisse
   * de la meme facon. La page de vente reste dehors : elle a sa propre
   * mise en page pleine largeur, sans coquille a respecter.
   */
  const fichiers = globSync('{components,app}/**/*.tsx', { cwd: racine })
    .filter((chemin) => !chemin.includes('/landing/'))
    .map((chemin) => ({ chemin, source: readFileSync(join(racine, chemin), 'utf8') }));

  it('trouve bien les fichiers à contrôler', () => {
    expect(fichiers.length).toBeGreaterThan(20);
  });

  it('ne sort jamais des marges avec une valeur écrite en dur', () => {
    // `-mx-5`, `-ml-5`, `-mx-4`… : une marge negative en unites Tailwind
    // sur un rail. Elle doit venir de `--marge-coquille`, sans quoi elle
    // diverge de la marge reelle sous 360 px.
    const fautifs = fichiers
      .filter(({ source }) => /className=[^>]*?-m[xl]-[45](?![0-9])/.test(source))
      .map(({ chemin }) => chemin);

    expect(
      fautifs,
      `Ces écrans sortent des marges avec une valeur en dur plutôt que « pleine-largeur » ou « var(--marge-coquille) » : ${fautifs.join(', ')}`,
    ).toEqual([]);
  });
});
