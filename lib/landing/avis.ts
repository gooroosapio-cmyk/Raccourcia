/**
 * Avis affiches sur la page de vente.
 *
 * Ce sont des messages reellement recus sur WhatsApp, repris tels quels :
 * l'orthographe, les abreviations et les emojis de leurs auteurs sont
 * conserves. Les lisser leur donnerait le meme ton qu'un texte de vente, et
 * c'est precisement ce ton-la qui ne se croit pas.
 *
 * Un avis sans texte ne s'affiche pas : la section entiere disparait si
 * aucun n'est renseigne.
 */
export type Avis = {
  /** Verbatim exact, tel que recu. */
  texte: string;
  auteur: string;
  lieu: string;
  /** Sur cinq. Ne pas arrondir vers le haut. */
  note: number;
};

export const AVIS: Avis[] = [
  {
    texte: '👏👏 impressionnant le temps que j’ai pu gagner. Merci beaucoup pour cette initiative.',
    auteur: 'G. Blaise',
    lieu: 'Côte d’Ivoire',
    note: 5,
  },
  {
    texte:
      '🤣😭 je n’arrête plus de modifier mes photos de famille pour les embellir. C’est énorme votre truc. Merci beaucoup à l’équipe.',
    auteur: 'Laurence',
    lieu: 'Cameroun',
    note: 5,
  },
  {
    texte:
      'Merci beaucoup, outil super, bien plus pratique que j’imaginais. Si vous faites des formations je ss intéressé par ça.',
    auteur: 'Samson',
    lieu: 'Sénégal',
    note: 5,
  },
  {
    texte:
      'Je suis devenue experte en prompt 🫠🎯. Je m’amuse à redécouvrir les capacités de mes IA 🎉🎉🎉.',
    auteur: 'Hene Diop',
    lieu: 'Sénégal',
    note: 5,
  },
];

/**
 * Pays d'ou viennent les retours recus.
 *
 * Cette liste n'est pas deduite des quatre avis affiches : l'equipe en recoit
 * davantage et n'en publie qu'une partie, faute d'accord explicite pour citer
 * les autres. Elle est donc tenue a la main, et ne s'allonge que d'un pays
 * d'ou un message est reellement arrive.
 *
 * L'ordre suit celui des premiers retours recus.
 */
export const PAYS_UTILISATEURS: string[] = [
  'Côte d’Ivoire',
  'Sénégal',
  'Cameroun',
  'Guinée',
  'RDC',
  'Bénin',
  'Togo',
  'Burkina Faso',
];

export function paysUtilisateurs(): string[] {
  return PAYS_UTILISATEURS;
}

/** Avis reellement publiables : ceux dont on a les mots. */
export function avisPublies(): Avis[] {
  return AVIS.filter((avis) => avis.texte.trim().length > 0);
}
