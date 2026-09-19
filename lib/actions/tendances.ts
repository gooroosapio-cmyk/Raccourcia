'use server';

import { z } from 'zod';
import { getCatalogPage } from '@/lib/catalog/queries';
import type { PromptCard } from '@/lib/catalog/types';
import { CATALOG_MAX_LOTS, CATALOG_PAGE_SIZE } from '@/lib/constants';

/**
 * Le palier suivant des tendances.
 *
 * L'accueil se termine par une galerie qu'on parcourt longtemps. Elle
 * arrivait entiere, bornee a un vivier de soixante cartes : passe la
 * soixantieme, il n'y avait plus rien, et rien ne le disait. Elle se
 * prolonge desormais tant que le catalogue en a.
 *
 * L'ordre est celui du catalogue — ce que l'administration epingle, ce qui
 * est offert, ce qui a un visuel, les nouveautes, puis la mise en avant.
 * Il se termine par la commande, qui est unique : sans derniere cle stable,
 * Postgres n'a aucune raison de rendre deux fois le meme ordre, et un
 * palier montrerait deux fois la meme carte ou en sauterait une.
 */
const entree = z.object({
  page: z.coerce.number().int().min(2).max(CATALOG_MAX_LOTS),
});

export async function chargerLesTendances(page: number): Promise<PromptCard[]> {
  const parse = entree.safeParse({ page });
  // Une page hors bornes rend une liste vide plutot qu'une erreur : la
  // galerie s'arrete, ce qui est exactement ce qu'elle ferait au bout.
  if (!parse.success) return [];

  const resultat = await getCatalogPage({
    mode: 'image',
    portee: 'catalogue',
    sort: 'populaires',
    page: parse.data.page,
    pageSize: CATALOG_PAGE_SIZE,
  });

  return resultat.items;
}
