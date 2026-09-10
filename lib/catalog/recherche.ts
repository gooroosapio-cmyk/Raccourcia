/**
 * Ce qu'une recherche interroge, isole de la base.
 *
 * Extrait de `queries.ts` pour la meme raison que l'ordre de tri : ces
 * regles se lisent et se verifient sans Postgres, et elles decident de ce
 * que quelqu'un trouve ou ne trouve pas.
 */

/**
 * Forme de comparaison d'un texte saisi.
 *
 * Doit donner le meme resultat que `public.texte_normalise` en base, sans
 * quoi la recherche ne trouverait pas ce que la colonne generee contient.
 * Minuscules, accents retires, tout ce qui n'est ni lettre ni chiffre
 * ramene a l'espace : « d'usage », « d usage » et « D'USAGE » se rejoignent.
 */
export function normaliserRecherche(terme: string): string {
  return terme
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Les portes par lesquelles un terme peut atteindre une commande.
 *
 * Trois, et elles comptent chacune pour quelqu'un :
 *   - le texte de la commande — son nom, sa description, son intention ;
 *   - les noms qu'elle a portes ou qu'elle absorbe. C'est la porte de la
 *     refonte : « /adsocial » et « /emailpro » ne sont plus des commandes
 *     mais des modes de commandes qui existent toujours, et quelqu'un qui
 *     tape le nom qu'il a garde en tete doit arriver quelque part ;
 *   - la famille, quand le terme designe un rayon plutot qu'un outil :
 *     « portrait » doit ramener la famille entiere.
 *
 * Rendues sous la forme attendue par le `or` de PostgREST.
 */
export function portesDeRecherche(terme: string, famillesTrouvees: string[]): string {
  const motif = `%${terme}%`;
  const portes = [`search_norm.ilike.${motif}`, `search_aliases.ilike.${motif}`];
  if (famillesTrouvees.length > 0) {
    portes.push(`category_id.in.(${famillesTrouvees.join(',')})`);
  }
  return portes.join(',');
}
