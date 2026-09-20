/**
 * Le motif d'une carte qui n'a pas de visuel.
 *
 * Une commande de Textes ou de Reflexions ne produit pas d'image : il n'y a
 * rien a photographier. Le cadre haut de sa carte portait donc une
 * composition typographique, la meme pour les deux cent quarante — une
 * galerie de rectangles bleus identiques, ou l'oeil ne s'accroche nulle
 * part et ou rien ne distingue un jeu de role d'un plan de tresorerie.
 *
 * Ces commandes recoivent un MOTIF, choisi d'apres leurs tags. Un
 * personnage pour l'immersion, un de pour le jeu, un graphique pour
 * l'analyse. C'est une illustration, jamais une photographie : promettre
 * une image a une commande qui rend du texte serait mentir sur le
 * resultat, et c'est exactement ce qu'on reproche aux banques d'images.
 *
 * LE MOTIF VIENT DES TAGS, PAS D'UNE LISTE DE COLLECTIONS. Figer ici les
 * slugs du catalogue reviendrait a coder la taxonomie dans le frontend :
 * une collection renommee en administration perdrait son dessin, et une
 * collection nouvelle n'en aurait jamais. Les tags, eux, sont deja le
 * vocabulaire transversal du catalogue — c'est leur role.
 *
 * Un tag inconnu ne rend rien : la carte retombe sur sa composition
 * typographique. Un dessin pris au hasard dirait quelque chose de faux.
 */

export type MotifIllustration = {
  /** Ce que le dessin represente, pour le choisir. */
  cle: string;
  /** Teinte du fond, en variables du theme ou en valeur fixe. */
  fond: string;
  /** Couleur du trait. */
  encre: string;
};

/**
 * Le vocabulaire des motifs.
 *
 * Chaque entree liste les FRAGMENTS de slug qui l'appellent : « jeu »
 * attrape « jeux-de-role » comme « jeu-de-societe ». Les fragments sont
 * ranges du plus precis au plus general — le premier qui accroche gagne,
 * donc « jeu-de-role » ne doit pas etre mange par « role ».
 */
const MOTIFS: { cle: string; fragments: string[]; fond: string; encre: string }[] = [
  {
    cle: 'personnage',
    fragments: ['immersion', 'personnage', 'role', 'incarn', 'dialogue', 'conversation'],
    fond: '#efeaff',
    encre: '#6a4bd6',
  },
  {
    cle: 'jeu',
    fragments: ['jeu', 'ludique', 'quiz', 'enigme', 'defi'],
    fond: '#fff1e6',
    encre: '#c2600d',
  },
  {
    cle: 'analyse',
    fragments: ['analyse', 'donnee', 'chiffre', 'tableur', 'finance', 'strategie', 'decision'],
    fond: '#e6f6ec',
    encre: '#1f8a4c',
  },
  {
    cle: 'redaction',
    fragments: ['redaction', 'ecriture', 'texte', 'article', 'copywriting', 'recit', 'narration'],
    fond: '#e8f0ff',
    encre: '#1463ff',
  },
  {
    cle: 'document',
    fragments: ['document', 'rapport', 'synthese', 'compte-rendu', 'contrat', 'juridique'],
    fond: '#eef1f5',
    encre: '#495a6e',
  },
  {
    cle: 'apprentissage',
    fragments: ['pedagogie', 'apprentissage', 'cours', 'formation', 'revision', 'etude'],
    fond: '#fdf0f5',
    encre: '#b8306e',
  },
  {
    cle: 'echange',
    fragments: ['email', 'message', 'reseau', 'publication', 'client', 'vente', 'prospection'],
    fond: '#e6f7fa',
    encre: '#0d7f95',
  },
];

/**
 * Le motif d'une carte, d'apres ses tags.
 *
 * Les tags sont parcourus dans leur ordre d'arrivee : le catalogue les
 * range du plus specifique au plus large, donc le premier qui accroche est
 * aussi le plus juste. `null` quand aucun ne dit rien — la carte garde
 * alors sa composition typographique.
 */
export function motifDeLaCarte(tags: { slug: string }[]): MotifIllustration | null {
  for (const tag of tags) {
    const slug = tag.slug.toLowerCase();
    for (const motif of MOTIFS) {
      if (motif.fragments.some((fragment) => slug.includes(fragment))) {
        return { cle: motif.cle, fond: motif.fond, encre: motif.encre };
      }
    }
  }
  return null;
}

/**
 * LES RAYONS, EUX, ONT TOUJOURS UN FOND.
 *
 * Une commande sans motif garde sa composition typographique : lui poser un
 * dessin pris au hasard mentirait sur ce qu'elle rend. Un RAYON — un tag,
 * une collection — ne rend rien ; c'est une porte. Une porte peut porter
 * une couleur sans rien promettre, et la Bibliotheque en montre cinquante
 * d'un coup : un tiers de cadres vides y fait une grille en damier ou
 * l'oeil ne sait plus ou se poser.
 *
 * Le fond est donc garanti, et le dessin reste facultatif : le motif quand
 * les mots du rayon en appellent un, l'initiale du nom sinon.
 */
export type TeinteDeRayon = { fond: string; encre: string };

/** Les memes couples que les motifs : une seule palette dans l'application. */
const TEINTES: TeinteDeRayon[] = MOTIFS.map(({ fond, encre }) => ({ fond, encre }));

/**
 * La teinte d'un rayon, tiree de son slug.
 *
 * Stable : le meme rayon garde sa couleur d'une visite a l'autre, et deux
 * rayons voisins dans la grille en ont presque toujours deux differentes.
 * Un tirage a chaque rendu ferait clignoter la page au rechargement.
 */
export function teinteDeRayon(cle: string): TeinteDeRayon {
  let somme = 0;
  for (let i = 0; i < cle.length; i += 1) somme = (somme * 31 + cle.charCodeAt(i)) % 100003;
  return TEINTES[somme % TEINTES.length]!;
}

/**
 * Ce qu'on dessine sur un rayon sans photo : un motif, ou son initiale.
 *
 * Le motif passe d'abord — il dit quelque chose. L'initiale ne dit rien,
 * mais elle distingue, et c'est tout ce qu'on lui demande.
 */
export function habillageDeRayon(
  slug: string,
  nom: string,
): { teinte: TeinteDeRayon; motif: string | null; initiale: string } {
  const motif = motifDeLaCarte([{ slug }]);
  return {
    teinte: motif ? { fond: motif.fond, encre: motif.encre } : teinteDeRayon(slug),
    motif: motif?.cle ?? null,
    initiale: (nom.trim()[0] ?? '·').toUpperCase(),
  };
}
