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
