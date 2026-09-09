import type { CatalogQuery } from '@/lib/validation/schemas';

/** Une cle de tri, telle que PostgREST l'attend. */
export type CleDeTri = {
  colonne: string;
  ascendant: boolean;
  /** Seulement pour les colonnes qui acceptent le vide. */
  nullsFirst?: boolean;
};

/**
 * L'ordre du catalogue, decide en un seul endroit.
 *
 * Il vit hors de `queries.ts` pour pouvoir etre lu sans base : c'est la
 * regle la plus facile a casser sans s'en apercevoir — une liste reste une
 * liste, meme mal triee — et la seule qu'aucun test d'integration SQL ne
 * couvre, puisqu'elle est posee par l'application et non par Postgres.
 *
 * Deux listes, et une seule difference entre elles :
 *
 * - Un **visiteur** voit d'abord ce qu'il peut copier. Sans compte, une
 *   commande verrouillee ne repond a rien qu'on puisse essayer tout de
 *   suite. La cle passe avant `media_ready` : le bloc offert vient en
 *   entier, et les cartes sans visuel ferment ce bloc comme elles ferment
 *   le suivant.
 * - Un **inscrit** retrouve l'ordre du catalogue. Les commandes offertes y
 *   reprennent leur place sans privilege : il n'a plus a distinguer ce
 *   qu'il peut essayer de ce qu'il peut prendre.
 *
 * Ensuite, pour tout le monde : ce qui a un visuel, ce que l'administration
 * a remonte, les nouveautes, puis le tri demande.
 *
 * `command` ferme toujours la liste. `sort_order` compte jusqu'a quatre ex
 * aequo dans le catalogue : sans derniere cle unique, Postgres n'a aucune
 * raison de rendre deux fois le meme ordre, et « Voir plus » peut montrer
 * deux fois la meme carte ou en sauter une.
 */
export function clesDeTri(sort: CatalogQuery['sort'], isMember: boolean): CleDeTri[] {
  const cles: CleDeTri[] = [];

  if (!isMember) cles.push({ colonne: 'is_free', ascendant: false });

  cles.push(
    { colonne: 'media_ready', ascendant: false },
    { colonne: 'is_pinned', ascendant: false },
    { colonne: 'is_new', ascendant: false },
  );

  if (sort === 'nouveaux') {
    cles.push({ colonne: 'published_at', ascendant: false, nullsFirst: false });
  } else if (sort === 'alpha') {
    cles.push({ colonne: 'name', ascendant: true });
  } else {
    cles.push(
      { colonne: 'is_featured', ascendant: false },
      { colonne: 'sort_order', ascendant: true },
    );
  }

  cles.push({ colonne: 'command', ascendant: true });

  return cles;
}
