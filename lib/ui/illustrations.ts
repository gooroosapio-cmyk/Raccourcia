import 'server-only';

import { ILLUSTRATIONS_DU_KIT } from '@/lib/ui/kit-illustrations';
import { ASSETS_PAR_RAYON } from '@/lib/ui/kit-taxonomie';

/**
 * L'illustration d'un rayon, pour la tuile qui y mene.
 *
 * Une composition abstraite, pas une photographie : ces dessins nomment un
 * rayon, ils ne montrent jamais ce qu'une commande produit. Confondre les
 * deux promettrait un resultat que le raccourci ne rend pas.
 *
 * Reservee au serveur : les cinquante illustrations pesent ensemble bien
 * plus que ce qu'un ecran en montre, et les tuiles sont rendues au serveur.
 *
 * `null` pour un rayon que le kit ne connait pas — la tuile se rabat alors
 * sur une composition typographique, ce qui reste honnete.
 */
export function illustrationDuRayon(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const assets = ASSETS_PAR_RAYON[slug];
  return assets ? (ILLUSTRATIONS_DU_KIT[assets.illustration] ?? null) : null;
}
