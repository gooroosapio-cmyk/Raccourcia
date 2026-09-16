import { normaliserRecherche } from '@/lib/catalog/recherche';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Ce qui organise les deux ecrans qui ne sont pas des rayons d'images.
 *
 * Les Modes IA et les Parcours guides se choisissent autrement : on ne
 * parcourt pas quatre-vingt-deux roles a la vignette, on cherche celui dont
 * on a besoin. Ces regles se lisent et se verifient sans base, comme l'ordre
 * de tri et la portee de recherche.
 */

/**
 * Le nom d'un rayon, deleste de ce que la page dit deja.
 *
 * « Parcours visuels » sous un titre « Parcours guides » repete le mot dans
 * la meme hauteur d'ecran, et sur une puce de filtre ce mot prend la moitie
 * de la place utile. Il devient « Visuels ».
 *
 * Une regle et non une table de correspondance : ecrire ici que
 * `parcours-visuels` s'affiche « Visuels » reviendrait a figer un libelle de
 * categorie dans le frontend, alors qu'il se corrige en administration. La
 * regle, elle, ne connait aucun rayon — elle ne fait que retirer un mot
 * qu'on vient de lire.
 *
 * Elle ne s'applique que si le reste tient debout : « Modes » retire de
 * « Modes IA » laisserait « IA », donc on garde le nom entier.
 */
export function nomCourtDuRayon(nomDuRayon: string, nomDeLaFamille: string): string {
  const premierMot = nomDeLaFamille.trim().split(/\s+/)[0];
  if (!premierMot) return nomDuRayon;

  const prefixe = normaliserRecherche(premierMot);
  const mots = nomDuRayon.trim().split(/\s+/);
  if (mots.length < 2 || normaliserRecherche(mots[0] ?? '') !== prefixe) return nomDuRayon;

  const reste = mots.slice(1).join(' ');
  if (reste.length < 4) return nomDuRayon;

  return reste.charAt(0).toUpperCase() + reste.slice(1);
}

/** Ce sur quoi la liste se restreint. */
export type FiltresDesFacons = {
  /** Le slug du rayon retenu, ou `null` pour tous. */
  rayon?: string | null;
  /** Ce qui a ete tape. */
  terme?: string;
};

/**
 * La liste, restreinte a ce qui est demande.
 *
 * La recherche porte sur le titre, le raccourci et la promesse — les trois
 * choses qu'on a en tete en arrivant. Elle ne porte pas sur le texte du
 * moteur : on chercherait « questions » et l'on ramenerait les quatre-vingt-
 * deux modes, qui en posent tous.
 *
 * Tout se fait ici, sans requete. Quatre-vingt-deux modes tiennent dans la
 * page ; un aller-retour par frappe couterait plus cher que de les filtrer.
 */
export function filtrerLesFacons(cartes: PromptCard[], filtres: FiltresDesFacons): PromptCard[] {
  const terme = normaliserRecherche(filtres.terme ?? '');
  const mots = terme ? terme.split(' ').filter(Boolean) : [];

  return cartes.filter((carte) => {
    if (filtres.rayon && carte.collectionSlug !== filtres.rayon) return false;
    if (mots.length === 0) return true;

    const champs = normaliserRecherche(
      [carte.name, carte.command, carte.shortDescription, carte.resultSummary].join(' '),
    );
    // Tous les mots, pas seulement le premier : « mode vente » doit ramener
    // ce qui repond aux deux, sinon taper plus long elargit le resultat.
    return mots.every((mot) => champs.includes(mot));
  });
}

/** Les rayons reellement representes dans la liste, dans l'ordre recu. */
export function rayonsPresents(
  cartes: PromptCard[],
  rayons: { slug: string; name: string }[],
): { slug: string; name: string }[] {
  const occupes = new Set(cartes.map((carte) => carte.collectionSlug).filter(Boolean));
  // Une puce qui ne ramene rien n'a rien a faire la : on la presse une fois,
  // on tombe sur une liste vide, et l'on doute du reste des puces.
  return rayons.filter((rayon) => occupes.has(rayon.slug));
}
