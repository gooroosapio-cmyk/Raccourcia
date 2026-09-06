import Link from 'next/link';

import { getAccessState } from '@/lib/access/entitlement';
import { getAvailableModes, getCatalogPage, getCategories } from '@/lib/catalog/queries';
import { DiscoveryConsole } from '@/components/discovery/discovery-console';
import { PromptGrid } from '@/components/cards/prompt-grid';
import { PaywallAutoOpen } from '@/components/paywall/paywall-provider';
import { EmptyState } from '@/components/ui/states';
import { catalogQuery } from '@/lib/validation/schemas';
import { NetworkError } from '@/components/ui/network-error';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
import type { FiltresAvances } from '@/components/discovery/filter-sheet';
import { CATALOG_MAX_LOTS, CATALOG_PAGE_SIZE, type Mode } from '@/lib/constants';

export const metadata = { title: 'Découvrir' };

/**
 * Bibliotheque des commandes. Rendue cote serveur : le client ne recoit que
 * les metadonnees publiques, jamais le contenu complet d'une commande.
 */
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const modes = getAvailableModes();

  const lire = (cle: string) => (typeof params[cle] === 'string' ? params[cle] : undefined);

  const requested = lire('mode');
  const mode: Mode = modes.includes(requested as Mode) ? (requested as Mode) : modes[0]!;

  // Zod filtre les valeurs inconnues : un parametre d'URL bricole ne peut ni
  // atteindre la requete, ni faire echouer la page.
  const query = catalogQuery.parse({
    mode,
    categorySlug: lire('categorie'),
    search: lire('q'),
    access: ['gratuit', 'membre'].includes(lire('acces') ?? '') ? lire('acces') : undefined,
    provider: ['chatgpt', 'claude', 'gemini'].includes(lire('ia') ?? '') ? lire('ia') : undefined,
    output: ['image', 'texte', 'pdf'].includes(lire('sortie') ?? '') ? lire('sortie') : undefined,
    page: lire('page') ?? 1,
  });

  // La bibliotheque s'affiche par lots cumules : « Voir plus » n'ouvre pas une
  // page suivante, il rallonge la liste. Une pagination numerotee ferait
  // perdre les cartes deja parcourues a chaque clic, et sur un telephone
  // personne ne revient en arriere pour les retrouver.
  const lots = Math.min(query.page, CATALOG_MAX_LOTS);
  const requete = { ...query, page: 1, pageSize: CATALOG_PAGE_SIZE * lots };

  let hasLifetimeAccess: boolean;
  let categories: Awaited<ReturnType<typeof getCategories>>;
  let page: Awaited<ReturnType<typeof getCatalogPage>>;

  try {
    [{ hasLifetimeAccess }, categories, page] = await Promise.all([
      getAccessState(),
      getCategories(mode),
      getCatalogPage(requete),
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

  const filtres: FiltresAvances = {
    acces: query.access,
    ia: query.provider,
    sortie: query.output as FiltresAvances['sortie'],
  };

  const filtre = Boolean(
    query.search || query.categorySlug || query.access || query.provider || query.output,
  );

  // Renvoi depuis un espace reserve : c'est le serveur qui a pose le
  // parametre, c'est donc lui qui decide d'ouvrir la fenetre. Le composant
  // client n'a plus a lire l'URL, et la coquille evite une frontiere
  // Suspense qui affaiblirait la garde des pages reservees.
  const renvoye = lire('offre') === '1' && !hasLifetimeAccess;

  // Le lot suivant reprend les filtres en cours : « Voir plus » ne doit jamais
  // reouvrir un catalogue different de celui qu'on regarde.
  const suivante = new URLSearchParams();
  suivante.set('mode', mode);
  if (query.categorySlug) suivante.set('categorie', query.categorySlug);
  if (query.search) suivante.set('q', query.search);
  if (query.access) suivante.set('acces', query.access);
  if (query.provider) suivante.set('ia', query.provider);
  if (query.output) suivante.set('sortie', query.output);
  suivante.set('page', String(lots + 1));

  return (
    <div className="space-y-3 pt-1">
      {renvoye ? <PaywallAutoOpen /> : null}

      <DiscoveryConsole
        modes={modes}
        mode={mode}
        categories={categories}
        categorySlug={query.categorySlug}
        search={query.search}
        filtres={filtres}
        resultCount={page.items.length}
      />

      <PromptGrid
        prompts={page.items}
        locked={!hasLifetimeAccess}
        emptyState={
          filtre ? (
            <EmptyState
              title="Aucune commande ne correspond"
              body="Essayez un autre mot, ou revenez a toutes les categories."
              actionLabel="Voir tout"
              actionHref={`/app?mode=${mode}`}
            />
          ) : (
            <EmptyState
              title="Rien à afficher ici"
              body="Ce mode ne contient pas encore de commande publiee."
            />
          )
        }
      />

      {page.hasMore ? (
        lots < CATALOG_MAX_LOTS ? (
          <div className="pt-1">
            <Link
              href={`/app?${suivante.toString()}`}
              scroll={false}
              className="flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[15px] font-medium text-[color:var(--color-night)]"
            >
              Voir plus de commandes
            </Link>
          </div>
        ) : (
          <p className="pt-1 text-center text-[13px] text-[color:var(--color-muted)]">
            Affinez la recherche ou choisissez une catégorie pour reduire la liste.
          </p>
        )
      ) : null}
    </div>
  );
}
