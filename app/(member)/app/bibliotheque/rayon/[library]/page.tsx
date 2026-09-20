import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSommaireDeBibliotheque } from '@/lib/catalog/sommaire';
import { Mosaique, type CarteDeMosaique } from '@/components/library/mosaique';
import { NetworkError } from '@/components/ui/network-error';
import { EmptyState } from '@/components/ui/states';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
import { LIBRARIES, LIBRARY_LABELS, LIBRARY_PROMESSES, type Library } from '@/lib/constants';

export async function generateMetadata({ params }: { params: Promise<{ library: string }> }) {
  const { library } = await params;
  return {
    title: LIBRARIES.includes(library as Library)
      ? LIBRARY_LABELS[library as Library]
      : 'Bibliothèque',
  };
}

/**
 * Le sommaire d'une bibliotheque.
 *
 * Toucher « Images » menait a l'accueil filtre : mille cartes a la suite.
 * C'est une bonne reponse quand on sait ce qu'on cherche, et un mur quand
 * on vient se reperer — or c'est precisement pour se reperer qu'on touche
 * le nom d'une bibliotheque.
 *
 * Cette page repond a l'autre question : qu'y a-t-il la-dedans ? Ses
 * collections et ses tags, en cartes illustrees, sans intitule de famille.
 * Le pouce choisit une porte plutot que de descendre un mur.
 *
 * « Tout voir » reste en bas, pour qui voulait bien le mur.
 */
export default async function RayonPage({ params }: { params: Promise<{ library: string }> }) {
  const { library: demandee } = await params;

  // Liste fermee : une bibliotheque inventee dans l'adresse ne mene nulle
  // part plutot que de rendre un sommaire vide.
  if (!LIBRARIES.includes(demandee as Library)) notFound();
  const library = demandee as Library;

  let sommaire: Awaited<ReturnType<typeof getSommaireDeBibliotheque>>;
  try {
    sommaire = await getSommaireDeBibliotheque(library);
  } catch (error) {
    if (isCatalogUnavailable(error)) {
      return (
        <div className="pt-6">
          <NetworkError />
        </div>
      );
    }
    throw error;
  }

  const cartes: CarteDeMosaique[] = [
    ...sommaire.collections.map((collection) => ({
      cle: `c-${collection.slug}`,
      href: `/app/bibliotheque/${collection.slug}`,
      titre: collection.nom,
      detail: `${collection.total} commande${collection.total > 1 ? 's' : ''}`,
      imageUrl: collection.apercuUrl,
    })),
    ...sommaire.tags.slice(0, 24).map((tag) => ({
      cle: `t-${tag.slug}`,
      href: `/app/bibliotheque/tag/${tag.slug}`,
      titre: tag.nom,
      detail: `${tag.total} commande${tag.total > 1 ? 's' : ''}`,
      imageUrl: tag.imageUrl,
    })),
  ];

  return (
    <div className="space-y-4 pt-1">
      <div>
        {/* Le chemin de retour nomme ou l'on va, pas « retour » : on sait
            d'ou l'on vient sans avoir a se souvenir du geste. */}
        <Link
          href="/app/bibliotheque"
          className="touch-target inline-flex items-center gap-1 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-brand)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m14 6-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Bibliothèque
        </Link>

        <h1 className="mt-1 text-[length:var(--texte-page)] font-bold leading-tight text-[color:var(--color-night)]">
          {LIBRARY_LABELS[library]}
        </h1>
        <p className="mt-0.5 text-[length:var(--texte-carte)] leading-snug text-[color:var(--color-muted)]">
          {LIBRARY_PROMESSES[library]}
        </p>
      </div>

      {cartes.length === 0 ? (
        <EmptyState
          title="Cette bibliothèque est vide"
          body="Aucune commande n’y est publiée pour le moment."
          actionLabel="Revenir à la bibliothèque"
          actionHref="/app/bibliotheque"
        />
      ) : (
        <>
          <Mosaique cartes={cartes} />

          <Link
            href={`/app?bibliotheque=${library}`}
            className="flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[15px] font-medium text-[color:var(--color-night)]"
          >
            Voir toutes les commandes
          </Link>
        </>
      )}
    </div>
  );
}
