import { ICONES_DU_KIT } from '@/lib/ui/kit-icones';
import { ASSETS_PAR_FAMILLE, ASSETS_PAR_RAYON } from '@/lib/ui/kit-taxonomie';

/**
 * Le trait qui designe un rayon, une famille, une action.
 *
 * Une icone se choisit par une clef venue de la base — le slug du rayon — et
 * jamais d'apres le libelle affiche. « Marques & publicite » et « Marques »
 * designent le meme rayon ; son slug, lui, ne bouge pas. C'est aussi ce qui
 * empeche qu'un rayon inconnu attrape l'icone du premier de la liste.
 *
 * Une clef inconnue rend `null`, et l'appelant montre alors autre chose. Le
 * kit ne fournit pas de symbole de repli — il annonce `icon-help`, qui n'y
 * figure pas — donc il n'y a rien a mettre a la place, et une icone prise au
 * hasard dirait quelque chose de faux.
 */
export type RoleDIcone =
  | 'search'
  | 'favorite'
  | 'copy'
  | 'filters'
  | 'home'
  | 'library'
  | 'profile'
  | 'back'
  | 'chevron'
  | 'close'
  | 'check'
  | 'sparkles'
  | 'mode'
  | 'journey';

/** Une icone d'interface, par son role. Toujours presente. */
export function iconeDuRole(role: RoleDIcone): string {
  const svg = ICONES_DU_KIT[role];
  if (!svg) throw new Error(`Icone de role absente : ${role}`);
  return svg;
}

/** L'icone d'un rayon, ou `null` si le kit ne le connait pas. */
export function iconeDuRayon(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const assets = ASSETS_PAR_RAYON[slug];
  return assets ? (ICONES_DU_KIT[assets.icone] ?? null) : null;
}

/** L'icone d'une famille, ou `null`. */
export function iconeDeLaFamille(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const assets = ASSETS_PAR_FAMILLE[slug];
  return assets ? (ICONES_DU_KIT[assets.icone] ?? null) : null;
}
