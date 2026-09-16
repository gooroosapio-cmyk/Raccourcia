import { getBibliotheque } from '@/lib/catalog/queries';
import { CollectionTile } from '@/components/library/collection-tile';
import { NetworkError } from '@/components/ui/network-error';
import { EmptyState } from '@/components/ui/states';
import { isCatalogUnavailable } from '@/lib/catalog/errors';

export const metadata = { title: 'Bibliothèque' };

/**
 * Premier palier de la Bibliotheque : les familles, et rien d'autre.
 *
 * On n'entre pas dans un catalogue de sept cents commandes par une grille de
 * sept cents cartes. On y entre par ce qu'on veut faire : une famille, puis
 * une collection, puis les commandes. Trois paliers, deux touches.
 *
 * Cette page montrait les huit familles avec leurs cinquante-trois
 * collections deployees : une page qu'on faisait defiler longtemps avant
 * d'avoir tout vu, et ou le deuxieme palier ne servait a rien.
 *
 * Les familles viennent de la base, jamais d'une liste ecrite ici : en
 * ajouter une en administration la fait apparaitre sans redeploiement.
 */
export default async function BibliothequePage() {
  let familles: Awaited<ReturnType<typeof getBibliotheque>>;

  try {
    familles = await getBibliotheque();
  } catch (error) {
    if (isCatalogUnavailable(error)) {
      return (
        <div className="space-y-4 pt-1">
          <Entete />
          <NetworkError />
        </div>
      );
    }
    throw error;
  }

  return (
    <div className="space-y-7 pt-1">
      <Entete />

      {familles.length === 0 ? (
        <EmptyState
          title="La bibliothèque est vide"
          body="Aucune collection n’est ouverte pour le moment."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 min-[400px]:gap-[var(--gouttiere-carte)] sm:grid-cols-3 lg:grid-cols-4">
          {familles.map((famille) => (
            <CollectionTile
              key={famille.id}
              tile={{
                id: famille.id,
                slug: famille.slug,
                name: famille.name,
                count: famille.count,
                imageUrl: famille.collections.find((c) => c.imageUrl)?.imageUrl ?? null,
              }}
              famille="Bibliothèque"
              href={`/app/bibliotheque/famille/${famille.slug}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Entete() {
  return (
    <div>
      <h1 className="text-[length:var(--texte-page)] font-bold leading-tight text-[color:var(--color-night)]">
        Toute la bibliothèque
      </h1>
      <p className="mt-1 text-[length:var(--texte-corps)] leading-relaxed text-[color:var(--color-muted)]">
        Parcourez les commandes par catégorie et par collection.
      </p>
    </div>
  );
}
