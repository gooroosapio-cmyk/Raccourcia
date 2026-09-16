import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBibliotheque } from '@/lib/catalog/queries';
import { CollectionTile } from '@/components/library/collection-tile';
import { NetworkError } from '@/components/ui/network-error';
import { isCatalogUnavailable } from '@/lib/catalog/errors';

/**
 * Deuxieme palier de la Bibliotheque : les collections d'une famille.
 *
 * « Créations et VFX » en compte vingt et une. Les deployer d'un coup fait
 * une page qu'on parcourt au pouce pendant dix secondes avant d'atteindre la
 * suivante : les six premieres suffisent a decider, le reste attend un geste.
 */
const PREMIERES = 6;

export async function generateMetadata({ params }: { params: Promise<{ famille: string }> }) {
  const { famille } = await params;
  const familles = await getBibliotheque().catch(() => []);
  return { title: familles.find((f) => f.slug === famille)?.name ?? 'Catégorie' };
}

export default async function FamillePage({
  params,
  searchParams,
}: {
  params: Promise<{ famille: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { famille: slug } = await params;
  const recherche = await searchParams;
  const tout = recherche.tout === '1';

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

  const peuplees = famille.collections.filter((collection) => collection.count > 0);
  const montrees = tout ? peuplees : peuplees.slice(0, PREMIERES);

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
      </div>

      <div className="grid grid-cols-2 gap-2 min-[400px]:gap-[var(--gouttiere-carte)]">
        {montrees.map((collection) => (
          <CollectionTile key={collection.id} tile={collection} famille={famille.name} />
        ))}
      </div>

      {!tout && peuplees.length > PREMIERES ? (
        <Link
          href={`/app/bibliotheque/famille/${slug}?tout=1`}
          scroll={false}
          className="touch-target flex w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[15px] font-medium text-[color:var(--color-night)]"
        >
          Voir toutes les collections ({peuplees.length})
        </Link>
      ) : null}
    </div>
  );
}
