import { publicEnv } from '@/lib/env';
import { STORAGE_BUCKETS } from '@/lib/constants';

/**
 * Largeurs de rendu, en pixels d'image.
 *
 * Elles valent environ deux fois la largeur d'affichage : un telephone
 * courant a un rapport de pixels de 2 a 3, et une vignette servie a sa
 * largeur CSS y parait floue.
 */
export const LARGEURS_VISUEL = {
  /** Vignette de carte : une demi-colonne sur un ecran de 360 a 430 px. */
  vignette: 420,
  /** Moitie d'une comparaison Avant/Apres, sur une figure de 640 px. */
  comparaison: 640,
  /** Apercu de 64 px dans la liste de l'administration. */
  apercu: 160,
} as const;

/**
 * Adresse publique d'un visuel, redimensionne par le stockage.
 *
 * Les fichiers deposes font 150 a 250 ko : une grille de vingt cartes en
 * telechargeait quatre megaoctets, et l'optimiseur d'images de l'hebergeur —
 * qui s'interposait jusqu'ici — a un quota mensuel. Ce quota epuise, il
 * repond « Payment Required » et l'image ne s'affiche plus du tout : c'est ce
 * qui a casse les vignettes des commandes deposees en dernier.
 *
 * Le stockage sait redimensionner lui-meme, sans quota et derriere son propre
 * cache. On lui demande donc la largeur utile : la meme image tombe de 180 ko
 * a 35 ko, et plus rien ne depend d'un compteur exterieur.
 *
 * `resize=contain` est indispensable : sans lui le stockage recadre en
 * remplissant, et une largeur seule ecrase l'image au lieu de la reduire.
 *
 * Sans largeur, l'adresse du fichier d'origine — pour un partage social ou un
 * telechargement, ou la taille n'a pas a etre devinee.
 */
export function urlVisuel(cheminStockage: string, largeur?: number): string {
  const base = `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1`;
  const bucket = STORAGE_BUCKETS.PROMPT_MEDIA;

  if (!largeur) return `${base}/object/public/${bucket}/${cheminStockage}`;

  return `${base}/render/image/public/${bucket}/${cheminStockage}?width=${largeur}&resize=contain&quality=72`;
}
