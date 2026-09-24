'use server';

import { z } from 'zod';
import { getCatalogPage } from '@/lib/catalog/queries';
import { catalogQuery } from '@/lib/validation/schemas';
import type { PromptCard } from '@/lib/catalog/types';
import { CATALOG_MAX_LOTS, CATALOG_PAGE_SIZE } from '@/lib/constants';

/**
 * Le lot suivant d'une galerie filtree, quel que soit l'ecran qui la porte.
 *
 * L'accueil filtre, une collection et un tag rendaient tous les trois un
 * bouton « Voir plus de commandes » qui rechargeait la page entiere. Sur un
 * telephone, cela veut dire : perdre sa position, attendre, puis retrouver
 * une liste plus longue qu'il faut redescendre. On abandonne avant la
 * troisieme fois — et personne ne voit jamais la centieme commande.
 *
 * Cette action rend le lot suivant seul, et la galerie se prolonge sous le
 * pouce. Le critere voyage avec l'appel parce que les trois ecrans ne
 * filtrent pas la meme chose ; il est REVALIDE ICI par le meme schema que
 * les pages, donc un appel direct a l'action ne peut ni elargir la portee,
 * ni reclamer tout le catalogue en une fois.
 *
 * Ce que l'action ne fait pas : decider des droits. `getCatalogPage` lit a
 * travers les politiques du lecteur, donc un visiteur n'obtient ici que ce
 * qu'il voit deja sur la page — les metadonnees publiques, jamais le texte
 * d'une commande.
 */
const critereDeGalerie = z.object({
  library: catalogQuery.shape.library,
  categorySlug: catalogQuery.shape.categorySlug,
  collectionSlug: z.string().trim().min(1).max(80).optional(),
  tags: catalogQuery.shape.tags,
  search: catalogQuery.shape.search,
  // « Gratuits » dans une collection, « Commencer gratuitement » a l'accueil.
  access: catalogQuery.shape.access,
  // « Pertinence » (l'ordre du catalogue) ou « Recentes ».
  sort: z.enum(['populaires', 'nouveaux']).optional(),
});

export type CritereDeGalerie = z.infer<typeof critereDeGalerie>;

const entree = z.object({
  critere: critereDeGalerie,
  // Jamais la premiere page : celle-la est deja rendue par le serveur, et
  // la redemander ferait doublon avec ce qui est a l'ecran.
  page: z.coerce.number().int().min(2).max(CATALOG_MAX_LOTS),
});

export async function chargerLaGalerie(
  critere: CritereDeGalerie,
  page: number,
): Promise<PromptCard[]> {
  const parse = entree.safeParse({ critere, page });
  // Hors bornes : une liste vide plutot qu'une erreur. La galerie s'arrete,
  // ce qu'elle ferait de toute facon au bout du catalogue.
  if (!parse.success) return [];

  const { critere: retenu, page: demandee } = parse.data;

  const resultat = await getCatalogPage(
    catalogQuery.parse({
      portee: 'catalogue',
      library: retenu.library,
      // Une collection est un rayon comme un autre pour la requete : c'est
      // son slug qui la designe, au meme titre qu'une famille.
      categorySlug: retenu.collectionSlug ?? retenu.categorySlug,
      tags: retenu.tags,
      search: retenu.search,
      access: retenu.access,
      sort: retenu.sort,
      page: demandee,
      pageSize: CATALOG_PAGE_SIZE,
    }),
  );

  return resultat.items;
}
