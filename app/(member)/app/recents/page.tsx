import { redirect } from 'next/navigation';
import { getAccessState } from '@/lib/access/entitlement';
import { getRecents } from '@/lib/catalog/queries';
import { PromptGrid } from '@/components/cards/prompt-grid';
import { EmptyState } from '@/components/ui/states';
import { NetworkError } from '@/components/ui/network-error';
import { isCatalogUnavailable } from '@/lib/catalog/errors';

export const metadata = { title: 'Récents' };

export default async function RecentsPage() {
  let hasFullAccess: boolean;
  let recents: Awaited<ReturnType<typeof getRecents>>;

  try {
    [{ hasFullAccess }, recents] = await Promise.all([getAccessState(), getRecents()]);
  } catch (error) {
    if (isCatalogUnavailable(error)) {
      return (
        <div className="space-y-4 pt-1">
          <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Récents</h1>
          <NetworkError />
        </div>
      );
    }
    throw error;
  }

  // Espace reserve : un visiteur sans acces a vie y trouverait une page vide,
  // ses favoris et son historique n'ayant de sens qu'une fois qu'il peut
  // copier. On le ramene au catalogue en ouvrant la fenetre d'offre.
  if (!hasFullAccess) redirect('/app?offre=1');

  return (
    <div className="space-y-4 pt-1">
      <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Récents</h1>
      <PromptGrid
        prompts={recents}
        locked={!hasFullAccess}
        emptyState={
          <EmptyState
            title="Rien de récent."
            body="Les commandes que vous copiez apparaissent ici, la plus recente en premier."
            actionLabel="Parcourir la bibliotheque"
            actionHref="/app"
          />
        }
      />
    </div>
  );
}
