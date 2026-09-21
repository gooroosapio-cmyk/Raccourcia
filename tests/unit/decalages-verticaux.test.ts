import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Ce qui fait bouger un ecran sous les yeux, et qu'un diff ne montre pas.
 *
 * Le gel horizontal a son propre fichier (`debordement-lateral`). Celui-ci
 * garde l'autre axe : les decalages VERTICAUX, ceux ou le contenu remonte
 * ou descend tout seul pendant qu'on le lit.
 *
 * Trois sont arrives en production, et aucun ne se voit en relisant le
 * code — il faut connaitre la regle pour reconnaitre sa violation. Le test
 * lit donc les sources comme du texte et verrouille la regle elle-meme.
 */
const racine = process.cwd();
const lire = (chemin: string) => readFileSync(join(racine, chemin), 'utf8');

describe('un pied de fiche garde la meme hauteur', () => {
  /**
   * LE DEFAUT. Le lien « Ouvrir ChatGPT » n'etait rendu qu'une fois la
   * copie faite. Le pied gagnait alors une cible de 44 px d'un coup, la
   * zone de lecture au-dessus perdait autant, et tout ce qu'on lisait
   * remontait — juste au moment ou l'on venait d'agir.
   *
   * LA REGLE. Ce qui apparait dans un panneau de hauteur fixe occupe sa
   * place des le depart. `invisible` garde la place, `hidden` la rend :
   * c'est la difference entre les deux qui compte ici.
   */
  const source = lire('components/cards/copy-command-button.tsx');

  it('rend la ligne d ouverture sur la possibilite, pas sur l evenement', () => {
    // `proposerOuverture` est connu au rendu ; `ouvertureProposee` n'arrive
    // qu'apres la copie. C'est le premier qui doit decider de la presence.
    expect(source).toMatch(/\{proposerOuverture && adresse \?/);
    expect(source, 'la ligne est de nouveau montee dans le flux apres la copie').not.toMatch(
      /\{ouvertureProposee && adresse \?/,
    );
  });

  it('masque la ligne sans lui retirer sa place', () => {
    expect(source).toContain("ouvertureProposee ? '' : 'invisible'");
  });

  it('la sort du parcours au clavier tant qu elle ne mene nulle part', () => {
    expect(source).toContain('tabIndex={ouvertureProposee ? undefined : -1}');
    expect(source).toContain('aria-hidden={!ouvertureProposee}');
  });
});

describe('une carte de galerie ne comprime jamais son bouton', () => {
  /**
   * LE DEFAUT. La carte texte se partageait en tiers. Une proportion ne
   * sait pas ce qu'elle contient : le dernier tiers devait loger deux
   * lignes de titre, une ligne de rayon et une cible de 44 px, ce qui n'y
   * tient pas — et `overflow-hidden` tranchait le coeur et le bouton a
   * mi-hauteur.
   *
   * LA REGLE. Le texte prend la hauteur qu'il lui faut, le visuel prend ce
   * qui reste. C'est le visuel qui cede, borne par un `min-h`.
   */
  const source = lire('components/cards/text-prompt-card.tsx');

  it('laisse au texte sa hauteur naturelle', () => {
    expect(source, 'le bloc du nom et du bouton est redevenu compressible').toContain(
      'flex shrink-0 flex-col px-2.5',
    );
  });

  it('ne partage plus la carte en proportions', () => {
    expect(source, 'les tiers sont revenus').not.toContain('flex-[2]');
  });

  it('garde un plancher au visuel, seule partie elastique', () => {
    expect(source).toContain('min-h-[92px] flex-1');
  });
});

describe('la barre basse ne bouge que pour un clavier', () => {
  /**
   * LE DEFAUT. La barre rattrapait n'importe quel ecart entre le viewport
   * visible et celui de mise en page. Une barre d'appel en cours suffisait
   * a la faire remonter de quelques dizaines de pixels, laissant sous elle
   * une bande vide.
   *
   * LA REGLE. Un seuil. Un clavier fait au moins le tiers de l'ecran ; une
   * barre systeme n'en fait jamais autant.
   */
  const source = lire('components/navigation/bottom-nav.tsx');

  it('compare l ecart a un seuil plutot qu a zero', () => {
    expect(source).toContain('SEUIL_CLAVIER');
    expect(source).toContain('ecart >= SEUIL_CLAVIER');
    expect(source, 'la correction repond de nouveau au moindre pixel').not.toContain(
      'ecart > 0 ? `translateY',
    );
  });
});

describe('les zones defilantes retiennent le geste', () => {
  /**
   * LE DEFAUT QU'ON EVITE. Une zone qui defile dans la page propage son
   * geste au document une fois arrivee au bout : la page saute derriere la
   * couche qu'on lit, et le navigateur mobile declenche son
   * rafraichissement par traction au milieu d'une lecture.
   */
  const zones = ['components/decouvrir/feed-immersif.tsx', 'components/detail/prompt-detail.tsx'];

  it.each(zones)('%s garde son geste', (chemin) => {
    const source = lire(chemin);
    const defilantes = [...source.matchAll(/className="[^"]*overflow-y-auto[^"]*"/g)].map(
      (trouve) => trouve[0],
    );

    expect(defilantes.length, 'plus aucune zone défilante à contrôler').toBeGreaterThan(0);
    for (const classe of defilantes) expect(classe).toContain('overscroll-contain');
  });
});
