import Link from 'next/link';
import { getAccessState } from '@/lib/access/entitlement';
import { getRecents } from '@/lib/catalog/queries';
import { PromptGrid } from '@/components/cards/prompt-grid';
import { NetworkError } from '@/components/ui/network-error';
import { isCatalogUnavailable } from '@/lib/catalog/errors';

export const metadata = { title: 'Recents' };

export default async function RecentsPage() {
  let hasLifetimeAccess: boolean;
  let recents: Awaited<ReturnType<typeof getRecents>>;

  try {
    [{ hasLifetimeAccess }, recents] = await Promise.all([getAccessState(), getRecents()]);
  } catch (error) {
    if (isCatalogUnavailable(error)) {
      return (
        <div className="space-y-4 pt-1">
          <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Recents</h1>
          <NetworkError />
        </div>
      );
    }
    throw error;
  }

  return (
    <div className="space-y-4 pt-1">
      <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Recents</h1>
      <PromptGrid
        prompts={recents}
        locked={!hasLifetimeAccess}
        emptyState={
          <div className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 text-center">
            <p className="text-[15px] font-medium text-[color:var(--color-night)]">
              Rien de recent.
            </p>
            <p className="mt-1 text-[13px] text-[color:var(--color-muted)]">
              Les raccourcis que vous copiez apparaitront ici.
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
