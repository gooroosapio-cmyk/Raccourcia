import type { PromptCard } from '@/lib/catalog/types';

/**
 * Ce qu'on ecrit quand une commande sort de l'application.
 *
 * LE PROBLEME. Le bouton Partager envoyait `resultSummary` tel quel :
 * « Un portrait studio au rendu editorial, fond neutre et lumiere douce. »
 * C'est une legende de catalogue. Collee dans une conversation, elle arrive
 * sans sujet, sans nom, sans rien qui dise d'ou elle vient ni ce qu'on est
 * cense en faire — et le lien a cote ressemble alors a une publicite.
 *
 * CE QU'ON ECRIT A LA PLACE. Trois temps, courts, dans l'ordre ou la
 * personne qui recoit le message se pose les questions : de quoi s'agit-il,
 * qu'est-ce que ca donne, qu'est-ce que j'ai a faire.
 *
 *     « Portrait studio » sur RaccourcIA.
 *     Une photo nette de la personne, et vous obtenez une image au format 4:5.
 *     Le raccourci est deja ecrit : il ne reste qu'a copier.
 *
 * TOUT VIENT DU CATALOGUE. Le nom, le temoin attendu, le format, le genre
 * d'experience. Rien n'est invente et rien n'est code en dur ici : une
 * commande sans temoin declare saute simplement sa deuxieme ligne, elle
 * n'en recoit pas une fausse.
 *
 * COURT, PARCE QUE LES MESSAGERIES COUPENT. Au-dela de deux cent
 * cinquante caracteres, la plupart tronquent l'apercu au milieu d'un mot.
 * La promesse du catalogue est donc ramenee a sa premiere phrase.
 *
 * Pas de `server-only` : la fiche est un composant client et c'est elle qui
 * declenche le partage. Rien ici ne touche a la base ni a un secret.
 */

/** Le format vise par defaut, comme sur la fiche. */
const RATIO_PAR_DEFAUT = '4:5';

/** Ce que les messageries affichent sans couper. */
const LONGUEUR_MAX = 120;

export function texteDePartage(prompt: PromptCard): string {
  const lignes = [
    `« ${prompt.name} » sur RaccourcIA.`,
    ceQuElleDemandeEtRend(prompt),
    'Le raccourci est déjà écrit : il ne reste qu’à copier.',
  ];

  return lignes.filter((ligne): ligne is string => Boolean(ligne)).join('\n');
}

/**
 * La ligne du milieu : ce qu'on donne, ce qu'on obtient.
 *
 * Elle depend du genre d'experience, parce que les trois ne se racontent
 * pas de la meme facon. Une commande image se resume a un echange — une
 * photo contre une image. Un mode et un parcours n'ont rien a echanger :
 * ce qu'ils promettent est leur conduite.
 */
function ceQuElleDemandeEtRend(prompt: PromptCard): string | null {
  const promesse = premierePhrase(prompt.resultSummary);

  if (prompt.entityType === 'mode_ia') {
    return promesse ? `Un mode à activer : ${minuscule(promesse)}` : null;
  }

  if (prompt.entityType === 'parcours') {
    return promesse ? `Un parcours guidé : ${minuscule(promesse)}` : null;
  }

  // Une commande image : le temoin d'un cote, le format de l'autre. C'est
  // l'echange concret, et c'est ce qui fait comprendre en une seconde.
  if (prompt.showImageCard) {
    const temoin = prompt.witnessType?.trim();
    const format = prompt.defaultRatio ?? RATIO_PAR_DEFAUT;
    if (temoin) {
      return `${majuscule(temoin)}, et vous obtenez une image au format ${format}.`;
    }
    return `Vous obtenez une image au format ${format}.`;
  }

  return promesse;
}

/**
 * La premiere phrase, et pas plus.
 *
 * Le catalogue ecrit parfois deux phrases dans la promesse. La seconde
 * precise, elle ne vend pas — et dans un message elle prend la place du
 * lien.
 */
function premierePhrase(texte: string): string | null {
  const propre = texte.trim();
  if (propre === '') return null;

  const fin = propre.search(/[.!?](\s|$)/);
  const phrase = fin === -1 ? propre : propre.slice(0, fin + 1);

  if (phrase.length <= LONGUEUR_MAX) return terminee(phrase);

  // Coupee au dernier mot entier : une phrase tronquee au milieu d'un mot
  // se lit comme une panne d'affichage.
  const coupe = phrase.slice(0, LONGUEUR_MAX);
  const espace = coupe.lastIndexOf(' ');
  return `${(espace > 40 ? coupe.slice(0, espace) : coupe).replace(/[,;:\s]+$/, '')}…`;
}

function terminee(phrase: string): string {
  return /[.!?…]$/.test(phrase) ? phrase : `${phrase}.`;
}

function majuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

function minuscule(texte: string): string {
  return texte.charAt(0).toLowerCase() + texte.slice(1);
}
