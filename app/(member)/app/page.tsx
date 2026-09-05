import { getAccessState } from '@/lib/access/entitlement';
import { getAvailableModes, getCatalogPage, getCategories } from '@/lib/catalog/queries';
import { LibraryFilters } from '@/components/filters/library-filters';
import { PromptGrid } from '@/components/cards/prompt-grid';
import { catalogQuery } from '@/lib/validation/schemas';
import { NetworkError } from '@/components/ui/network-error';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
import type { Mode } from '@/lib/constants';

export const metadata = { title: 'Decouvrir' };

/**
 * Bibliotheque. Rendue cote serveur : le client ne recoit que les
 * metadonnees publiques, jamais les prompts complets.
 */
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const modes = await getAvailableModes();

  const requested = typeof params.mode === 'string' ? params.mode : undefined;
  const mode: Mode = modes.includes(requested as Mode) ? (requested as Mode) : modes[0]!;

  const query = catalogQuery.parse({
    mode,
    categorySlug: typeof params.categorie === 'string' ? params.categorie : undefined,
    search: typeof params.q === 'string' ? params.q : undefined,
    page: typeof params.page === 'string' ? params.page : 1,
  });

  let hasLifetimeAccess: boolean;
  let categories: Awaited<ReturnType<typeof getCategories>>;
  let page: Awaited<ReturnType<typeof getCatalogPage>>;

  try {
    [{ hasLifetimeAccess }, categories, page] = await Promise.all([
      getAccessState(),
      getCategories(mode),
      getCatalogPage(query),
    ]);
  } catch (error) {
    // Un catalogue injoignable n'est pas un catalogue vide.
    if (isCatalogUnavailable(error)) {
      return (
        <div className="pt-6">
          <NetworkError />
        </div>
      );
    }
    throw error;
  }

  return (
    <div className="space-y-4 pt-1">
      <LibraryFilters
        modes={modes}
        mode={mode}
        categories={categories}
        categorySlug={query.categorySlug}
        search={query.search}
      />

      <PromptGrid
        prompts={page.items}
        locked={!hasLifetimeAccess}
        emptyState={
          <EmptyResults hasFilters={Boolean(query.search || query.categorySlug)} mode={mode} />
        }
      />

      {page.hasMore ? (
        <p className="pt-2 text-center text-[13px] text-[color:var(--color-muted)]">
          Affinez la recherche ou choisissez une categorie pour reduire la liste.
        </p>
      ) : null}
    </div>
  );
}

/** Jamais d'ecran mort : on propose toujours une sortie (Spec UX/UI, 7). */
function EmptyResults({ hasFilters, mode }: { hasFilters: boolean; mode: Mode }) {
  return (
    <div className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 text-center">
      <p className="text-[15px] font-medium text-[color:var(--color-night)]">
        Aucun raccourci ne correspond.
      </p>
      <p className="mt-1 text-[13px] text-[color:var(--color-muted)]">
        {hasFilters
          ? 'Essayez un autre mot, ou revenez a toutes les categories.'
          : 'Ce mode ne contient pas encore de raccourci publie.'}
      </p>
      {hasFilters ? (
        <a
          href={`/app?mode=${mode}`}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-4 text-sm font-medium text-white"
        >
          Voir tout
        </a>
      ) : null}
    </div>
  );
}
