import { redirect } from 'next/navigation';
import { getAccessState } from '@/lib/access/entitlement';
import { getFavorites } from '@/lib/catalog/queries';
import { PromptGrid } from '@/components/cards/prompt-grid';
import { EmptyState } from '@/components/ui/states';
import { NetworkError } from '@/components/ui/network-error';
import { isCatalogUnavailable } from '@/lib/catalog/errors';

export const metadata = { title: 'Favoris' };

export default async function FavoritesPage() {
  let hasFullAccess: boolean;
  let favorites: Awaited<ReturnType<typeof getFavorites>>;

  try {
    [{ hasFullAccess }, favorites] = await Promise.all([getAccessState(), getFavorites()]);
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

  // Espace reserve : un visiteur sans acces a vie y trouverait une page vide,
  // ses favoris et son historique n'ayant de sens qu'une fois qu'il peut
  // copier. On le ramene au catalogue en ouvrant la fenetre d'offre.
  if (!hasFullAccess) redirect('/app?offre=1');

  return (
    <div className="space-y-4 pt-1">
      <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Favoris</h1>
      <PromptGrid
        prompts={favorites}
        locked={!hasFullAccess}
        emptyState={
          <EmptyState
            title="Aucun favori pour l’instant."
            body="Ajoutez vos commandes preferees pour les retrouver ici."
            actionLabel="Parcourir la bibliotheque"
            actionHref="/app"
          />
        }
      />
    </div>
  );
}
