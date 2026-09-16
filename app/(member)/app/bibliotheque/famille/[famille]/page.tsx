import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBibliotheque } from '@/lib/catalog/queries';
import { CollectionTile } from '@/components/library/collection-tile';
import { NetworkError } from '@/components/ui/network-error';
import { isCatalogUnavailable } from '@/lib/catalog/errors';

export async function generateMetadata({ params }: { params: Promise<{ famille: string }> }) {
  const { famille } = await params;
  const familles = await getBibliotheque().catch(() => []);
  return { title: familles.find((f) => f.slug === famille)?.name ?? 'Catégorie' };
}

export default async function FamillePage({ params }: { params: Promise<{ famille: string }> }) {
  const { famille: slug } = await params;

  let familles: Awaited<ReturnType<typeof getBibliotheque>>;
  try {
    familles = await getBibliotheque();
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

  const famille = familles.find((f) => f.slug === slug);
  if (!famille) notFound();

  // Toutes, et sans bouton. Le palier intermediaire economisait un ecran de
  // defilement et coutait un geste : on entrait dans un rayon pour se voir
  // proposer d'en voir le reste. Un rayon montre ce qu'il contient.
  const montrees = famille.collections.filter((collection) => collection.count > 0);

  return (
    <div className="space-y-4 pt-1">
      <div>
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
          {famille.name}
        </h1>

        {/* Ce que la famille contient, dit une fois en haut plutot que devine
            en lisant les noms de ses rayons. */}
        {famille.description ? (
          <p className="mt-1 text-[length:var(--texte-carte)] leading-[1.45] text-[color:var(--color-muted)]">
            {famille.description}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 min-[400px]:gap-[var(--gouttiere-carte)]">
        {montrees.map((collection) => (
          <CollectionTile key={collection.id} tile={collection} famille={famille.name} />
        ))}
      </div>
    </div>
  );
}
