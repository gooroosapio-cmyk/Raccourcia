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

describe('la barre basse suit le viewport visible', () => {
  /**
   * LE DEFAUT, ET LA CORRECTION QUI L'A RAMENE.
   *
   * En remontant la page, la barre d'adresse du navigateur reapparait et le
   * viewport visible perd sa hauteur. Sans correction, la barre basse
   * descend sous le bord de l'ecran, tranchee en deux.
   *
   * Un seuil de cent pixels avait ete pose pour ignorer les petits ecarts —
   * une bande vide vue sous la barre pendant un appel telephonique. Il a
   * ramene le defaut d'en face aussitot : les deux ecarts font la meme
   * taille, environ cinquante pixels, et celui qui arrive a chaque geste
   * est celui de la barre d'adresse.
   *
   * LA REGLE. Aucun seuil. La correction repond a n'importe quel ecart, et
   * la fenetre est ecoutee en plus du viewport visible pour qu'une hauteur
   * perimee se corrige au rafraichissement suivant.
   */
  const source = lire('components/navigation/bottom-nav.tsx');

  it('rattrape n importe quel ecart', () => {
    expect(source).toContain('ecart > 0 ? `translateY');
    expect(source, 'le seuil est revenu, et avec lui la barre tranchee').not.toContain(
      'SEUIL_CLAVIER',
    );
  });

  it('ecoute la fenetre autant que le viewport visible', () => {
    // Sans cette seconde ecoute, une hauteur de fenetre perimee reste
    // fausse jusqu'au prochain evenement du viewport visible.
    expect(source).toContain("window.addEventListener('resize', placer)");
    expect(source).toContain("vv.addEventListener('resize', placer)");
    expect(source).toContain("vv.addEventListener('scroll', placer)");
  });

  it('retire tout ce qu elle a pose', () => {
    expect(source).toContain("window.removeEventListener('resize', placer)");
    expect(source).toContain("vv.removeEventListener('resize', placer)");
    expect(source).toContain("vv.removeEventListener('scroll', placer)");
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

describe('la feuille de l offre donne ses boutons sans defilement', () => {
  /**
   * LE DEFAUT. La fenetre empilait l'argumentaire, le prix et les boutons
   * dans une seule zone defilante. Sur un telephone, le prix et « Passer en
   * Premium » tombaient sous le bord : il fallait faire defiler l'offre
   * pour trouver comment l'accepter. C'est le pire endroit du produit pour
   * demander un geste de plus.
   *
   * LA REGLE. Le pied ne defile pas. Ce n'est pas un reglage d'espacement
   * qu'un ecran plus petit reprendrait : c'est une garantie de structure,
   * vraie quelle que soit la longueur du texte au-dessus.
   */
  const source = lire('components/paywall/offer-sheet.tsx');

  it('separe la zone defilante du pied', () => {
    expect(source).toContain('min-h-0 flex-1 overflow-y-auto overscroll-contain');
    expect(source).toContain('shrink-0 border-t');
  });

  it('pose l action dans le pied et l argumentaire au-dessus', () => {
    // Les usages, pas l'import : celui-ci nomme les deux dans l'ordre
    // alphabetique et ne dit rien de leur place dans l'ecran.
    const argumentaire = source.indexOf('<ArgumentaireDOffre');
    const actions = source.indexOf('<ActionsDOffre');
    expect(argumentaire, 'l’argumentaire a disparu de la feuille').toBeGreaterThan(-1);
    expect(actions, 'l’action a disparu de la feuille').toBeGreaterThan(-1);
    expect(actions, 'l’action est remontée dans la zone défilante').toBeGreaterThan(argumentaire);
  });

  it('ne remet pas tout le panneau dans le defilement', () => {
    expect(source, 'le panneau entier est revenu dans la zone défilante').not.toContain(
      '<UpgradePanel',
    );
  });
});

describe('Decouvrir ne montre au visiteur que ce qu il peut copier', () => {
  /**
   * LE DEFAUT. Le feed montrait les deux cent trente-quatre commandes
   * illustrees a tout le monde et verrouillait la copie a l'arrivee : le
   * visiteur parcourait un mur de resultats dont il ne pouvait rien faire.
   *
   * LA REGLE, ET SON POINT DELICAT. Le droit se relit au serveur a chaque
   * palier. Le premier est rendu par la page ; les suivants arrivent par
   * une action serveur, et un drapeau envoye par le navigateur serait un
   * drapeau qu'on peut retourner.
   */
  it('relit le droit a chaque palier plutot que de le recevoir', () => {
    const action = lire('lib/actions/decouverte.ts');
    expect(action).toContain('getAccessState');
    expect(action).toContain('offertesSeulement: !acces.hasFullAccess');
    // La signature ne prend qu'un curseur : rien d'autre ne traverse.
    expect(action).toContain('chargerLaSuite(depuis: CurseurDecouverte)');
  });

  it('pose le filtre dans la requete, pas apres coup', () => {
    const lecture = lire('lib/catalog/decouverte.ts');
    expect(lecture).toContain("if (offertesSeulement) requete = requete.eq('is_free', true);");
  });

  it('compte ce que le feed montre, et pas davantage', () => {
    // Sinon l'ecran vide annonce une panne a un visiteur qui n'a
    // simplement aucune commande offerte illustree.
    const lecture = lire('lib/catalog/decouverte.ts');
    expect(lecture).toContain('compterLesVisuels = cache(');
    expect(lecture).toMatch(/compterLesVisuels[\s\S]{0,600}offertesSeulement/);
  });
});
