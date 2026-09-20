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
 * - **Sans acces complet**, on voit d'abord ce qu'on peut copier. Une
 *   commande verrouillee ne repond a rien qu'on puisse essayer tout de
 *   suite. La cle passe avant `media_ready` : le bloc offert vient en
 *   entier, et les cartes sans visuel ferment ce bloc comme elles ferment
 *   le suivant.
 * - **Avec l'acces complet**, l'ordre du catalogue reprend. Les commandes
 *   offertes y perdent leur privilege : un membre qui a tout paye n'a plus
 *   a distinguer ce qu'il peut essayer de ce qu'il peut prendre, et les
 *   remonter lui ferait voir en premier les quinze memes cartes.
 *
 * Le critere est bien l'ACCES et non le compte. Un visiteur et un inscrit
 * qui n'a pas encore paye sont dans la meme situation : pour eux deux, une
 * commande reservee est un mur.
 *
 * Ensuite, pour tout le monde : ce qui a un visuel, ce que l'administration
 * a remonte, les nouveautes, puis le tri demande.
 *
 * `command` ferme toujours la liste. `sort_order` compte jusqu'a quatre ex
 * aequo dans le catalogue : sans derniere cle unique, Postgres n'a aucune
 * raison de rendre deux fois le meme ordre, et « Voir plus » peut montrer
 * deux fois la meme carte ou en sauter une.
 */
export function clesDeTri(sort: CatalogQuery['sort'], accesComplet: boolean): CleDeTri[] {
  const cles: CleDeTri[] = [];

  if (!accesComplet) cles.push({ colonne: 'is_free', ascendant: false });

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
