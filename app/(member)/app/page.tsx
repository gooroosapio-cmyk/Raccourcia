import Link from 'next/link';

import { getAccessState } from '@/lib/access/entitlement';
import {
  getAvailableModes,
  getCatalogPage,
  getCategories,
  getSectionsAccueil,
} from '@/lib/catalog/queries';
import { DiscoveryConsole } from '@/components/discovery/discovery-console';
import { AucunResultat } from '@/components/discovery/aucun-resultat';
import { SectionAccueil } from '@/components/discovery/section-accueil';
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

  // « text » est accepte comme « texte » : les liens partages hors de
  // l'application emploient souvent la forme anglaise, et retomber en
  // silence sur Image donnerait a l'auteur du lien une page qu'il n'a pas
  // voulu partager.
  const demande = lire('mode') === 'text' ? 'texte' : lire('mode');
  const mode: Mode = modes.includes(demande as Mode) ? (demande as Mode) : modes[0]!;

  // Zod filtre les valeurs inconnues : un parametre d'URL bricole ne peut ni
  // atteindre la requete, ni faire echouer la page.
  const query = catalogQuery.parse({
    mode,
    categorySlug: lire('categorie'),
    search: lire('q'),
    access: ['gratuit', 'membre'].includes(lire('acces') ?? '') ? lire('acces') : undefined,
    provider: ['chatgpt', 'claude', 'gemini'].includes(lire('ia') ?? '') ? lire('ia') : undefined,
    output: ['image', 'texte', 'pdf'].includes(lire('sortie') ?? '') ? lire('sortie') : undefined,
    level: ['faible', 'moyen', 'eleve'].includes(lire('niveau') ?? '') ? lire('niveau') : undefined,
    page: lire('page') ?? 1,
  });

  // La bibliotheque s'affiche par lots cumules : « Voir plus » n'ouvre pas une
  // page suivante, il rallonge la liste. Une pagination numerotee ferait
  // perdre les cartes deja parcourues a chaque clic, et sur un telephone
  // personne ne revient en arriere pour les retrouver.
  const lots = Math.min(query.page, CATALOG_MAX_LOTS);
  const requete = { ...query, page: 1, pageSize: CATALOG_PAGE_SIZE * lots };

  const filtre = Boolean(
    query.search ||
    query.categorySlug ||
    query.access ||
    query.provider ||
    query.output ||
    query.level,
  );

  // Les rangees thematiques n'ont de sens que sur l'Accueil nu : des qu'une
  // recherche ou un filtre est pose, l'utilisateur cherche une chose precise
  // et tout ce qui la precede l'eloigne du resultat. Le calcul precede les
  // requetes : les lire pour ne pas les afficher couterait six allers-retours
  // a chaque touche frappee.
  const montrerSections = !filtre && lots === 1;

  let acces: Awaited<ReturnType<typeof getAccessState>>;
  let categories: Awaited<ReturnType<typeof getCategories>>;
  let page: Awaited<ReturnType<typeof getCatalogPage>>;
  let sections: Awaited<ReturnType<typeof getSectionsAccueil>>;

  try {
    [acces, categories, page, sections] = await Promise.all([
      getAccessState(),
      getCategories(mode),
      getCatalogPage(requete),
      montrerSections
        ? getSectionsAccueil(mode)
        : Promise.resolve({ recents: [], favoris: [], recommandations: [] }),
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
    niveau: query.level,
  };

  // Les commandes sans visuel ne donnent pas la premiere impression : elles
  // sont regroupees plus bas, sous leur propre titre. Pas « bientot
  // disponible » — elles le sont deja, et le dire indisponible ferait
  // renoncer a une commande parfaitement utilisable. C'est l'apercu qui
  // manque, pas la commande.
  const illustrees = page.items.filter((carte) => carte.mediaStatus === 'pret');
  const sansVisuel = page.items.filter((carte) => carte.mediaStatus === 'attente');

  // Renvoi depuis un espace reserve : c'est le serveur qui a pose le
  // parametre, c'est donc lui qui decide d'ouvrir la fenetre. Le composant
  // client n'a plus a lire l'URL, et la coquille evite une frontiere
  // Suspense qui affaiblirait la garde des pages reservees.
  const renvoye = lire('offre') === '1' && !acces.hasFullAccess;

  // Le lot suivant reprend les filtres en cours : « Voir plus » ne doit jamais
  // reouvrir un catalogue different de celui qu'on regarde.
  const suivante = new URLSearchParams();
  suivante.set('mode', mode);
  if (query.categorySlug) suivante.set('categorie', query.categorySlug);
  if (query.search) suivante.set('q', query.search);
  if (query.access) suivante.set('acces', query.access);
  if (query.provider) suivante.set('ia', query.provider);
  if (query.output) suivante.set('sortie', query.output);
  if (query.level) suivante.set('niveau', query.level);
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
        resultCount={page.total}
      />

      {montrerSections ? (
        <>
          <SectionAccueil
            id="titre-recents"
            titre="Reprendre vos récents"
            aide="Ce que vous avez copié ou ouvert en dernier."
            prompts={sections.recents}
          >
            <PromptGrid
              prompts={sections.recents}
              locked={!acces.hasFullAccess}
              emptyState={null}
              prioritaire={false}
            />
          </SectionAccueil>

          <SectionAccueil id="titre-favoris" titre="Vos favoris" prompts={sections.favoris}>
            <PromptGrid
              prompts={sections.favoris}
              locked={!acces.hasFullAccess}
              emptyState={null}
              prioritaire={false}
            />
          </SectionAccueil>

          <SectionAccueil
            id="titre-recommandations"
            titre="Commandes recommandées"
            aide="Dans les familles où vous revenez, et que vous n’avez pas encore ouvertes."
            prompts={sections.recommandations}
          >
            <PromptGrid
              prompts={sections.recommandations}
              locked={!acces.hasFullAccess}
              emptyState={null}
              prioritaire={false}
            />
          </SectionAccueil>

          {sections.recents.length > 0 ||
          sections.favoris.length > 0 ||
          sections.recommandations.length > 0 ? (
            <h2 className="pt-3 text-[length:var(--texte-section)] font-semibold text-[color:var(--color-night)]">
              Tout le catalogue
            </h2>
          ) : null}
        </>
      ) : null}

      <PromptGrid
        prompts={illustrees}
        locked={!acces.hasFullAccess}
        visiteur={!acces.isMember}
        emptyState={
          sansVisuel.length > 0 ? null : filtre ? (
            <AucunResultat terme={query.search} mode={mode} />
          ) : (
            <EmptyState
              title="Rien à afficher ici"
              body="Ce mode ne contient pas encore de commande publiée."
            />
          )
        }
      />

      {sansVisuel.length > 0 ? (
        <section aria-labelledby="titre-sans-visuel" className="space-y-2 pt-3">
          <div>
            <h2
              id="titre-sans-visuel"
              className="text-[length:var(--texte-section)] font-semibold text-[color:var(--color-night)]"
            >
              Encore sans visuel
            </h2>
            <p className="text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
              Ces commandes fonctionnent déjà. Seul leur aperçu reste à produire.
            </p>
          </div>
          <PromptGrid
            prompts={sansVisuel}
            locked={!acces.hasFullAccess}
            visiteur={!acces.isMember}
            emptyState={null}
            prioritaire={false}
          />
        </section>
      ) : null}

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
