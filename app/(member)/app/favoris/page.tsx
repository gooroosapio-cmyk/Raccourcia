import Link from 'next/link';
import { getAccessState } from '@/lib/access/entitlement';
import { getFavorites } from '@/lib/catalog/queries';
import { PromptGrid } from '@/components/cards/prompt-grid';
import { NetworkError } from '@/components/ui/network-error';
import { isCatalogUnavailable } from '@/lib/catalog/errors';

export const metadata = { title: 'Favoris' };

export default async function FavoritesPage() {
  let hasLifetimeAccess: boolean;
  let favorites: Awaited<ReturnType<typeof getFavorites>>;

  try {
    [{ hasLifetimeAccess }, favorites] = await Promise.all([getAccessState(), getFavorites()]);
  } catch (error) {
    if (isCatalogUnavailable(error)) {
      return (
        <div className="space-y-4 pt-1">
          <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Favoris</h1>
          <NetworkError />
        </div>
      );
    }
    throw error;
  }

  return (
    <div className="space-y-4 pt-1">
      <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Favoris</h1>
      <PromptGrid
        prompts={favorites}
        locked={!hasLifetimeAccess}
        emptyState={
          <div className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 text-center">
            <p className="text-[15px] font-medium text-[color:var(--color-night)]">
              Aucun favori pour l instant.
            </p>
            <p className="mt-1 text-[13px] text-[color:var(--color-muted)]">
              Ajoutez vos raccourcis preferes pour les retrouver ici.
            </p>
            <Link
              href="/app"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-4 text-sm font-medium text-white"
            >
              Parcourir la bibliotheque
            </Link>
          </div>
        }
      />
    </div>
  );
}
