import { estUnivers, universActif } from '@/lib/catalog/univers';
import { getAccessState } from '@/lib/access/entitlement';
import { getBibliotheque, getCatalogPage, getDernieresCopies } from '@/lib/catalog/queries';
import { getFacettes } from '@/lib/catalog/filtres';
import { getSommaireDeBibliotheque } from '@/lib/catalog/sommaire';
import { getVisuelsTournants, visuelDeCollection } from '@/lib/catalog/visuels';
import { traitsDesRayons } from '@/lib/catalog/rayons';
import { FiltreDepliant, type SelectionAccueil } from '@/components/discovery/filtre-depliant';
import { AucunResultat } from '@/components/discovery/aucun-resultat';
import { GalerieInfinie } from '@/components/cards/galerie-infinie';
import { PromptGrid } from '@/components/cards/prompt-grid';
import { CollectionsPopulaires } from '@/components/accueil/collections-populaires';
import { ChoixUnivers } from '@/components/accueil/choix-univers';
import { RechercheAccueil } from '@/components/accueil/recherche-accueil';
import {
  IconeCollections,
  IconeRecemment,
  IconeTendances,
  TitreDeSection,
} from '@/components/accueil/titre-de-section';
import { PaywallAutoOpen } from '@/components/paywall/paywall-provider';
import { catalogQuery } from '@/lib/validation/schemas';
import { NetworkError } from '@/components/ui/network-error';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
import { CATALOG_PAGE_SIZE, LIBRARY_LABELS } from '@/lib/constants';

export const metadata = { title: 'Accueil' };

/** Cinq tags au plus : au-dela, le croisement ne rend plus jamais rien. */
const TAGS_MAX = 5;

/**
 * L'accueil : un univers actif, et tout ce qui le concerne.
 *
 * L'ORDRE DU RAPPORT DE REFONTE (23 septembre 2026) :
 *   1. « Que voulez-vous creer ? » et la recherche, tout de suite ;
 *   2. les trois univers, sans description ;
 *   3. « Commencer gratuitement », tant que l'acces complet manque ;
 *   4. les collections a explorer dans l'univers, et « Toutes » ;
 *   5. les copies recentes dans l'univers, masquees si vides ;
 *   6. la selection de commandes de l'univers, qui s'allonge au defilement.
 *
 * L'UNIVERS ACTIF. Visuels a la premiere visite, puis le dernier choisi
 * explicitement (cookie pose par `ChoixUnivers`). Un lien peut imposer le
 * sien par `?univers=` ; le bouton actif le montre.
 *
 * Des qu'une recherche ou un filtre est demande, l'accueil devient une
 * liste de resultats, bornee a l'univers sauf si la recherche est elargie.
 *
 * Rendu au serveur. Le client ne recoit que les metadonnees publiques,
 * jamais le texte d'une commande.
 */
export default async function AccueilPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const lire = (cle: string) => (typeof params[cle] === 'string' ? params[cle] : undefined);

  const univers = await universActif(lire('univers'));

  // La bibliotheque d'une recherche ou d'un filtre. « partout » l'efface :
  // c'est l'elargissement explicite aux trois.
  const partout = lire('partout') === '1';
  const demandee = lire('bibliotheque');
  const library = partout ? undefined : estUnivers(demandee) ? demandee : undefined;

  const tags = (lire('tags') ?? '')
    .split(',')
    .map((entree) => entree.trim())
    .filter(Boolean)
    .slice(0, TAGS_MAX);
  const recherche = lire('q')?.trim() || undefined;
  const acces = lire('acces') === 'gratuit' ? ('gratuit' as const) : undefined;

  let etat: Awaited<ReturnType<typeof getAccessState>>;
  let facettes: Awaited<ReturnType<typeof getFacettes>>;
  try {
    [etat, facettes] = await Promise.all([getAccessState(), getFacettes(library ?? null)]);
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

  // Une famille demandee qui n'existe plus est ignoree, pas rendue vide.
  const connues = new Set(facettes.familles.map((famille) => famille.slug));
  const demandeeCategorie = lire('categorie');
  const categorie =
    demandeeCategorie && connues.has(demandeeCategorie) ? demandeeCategorie : undefined;

  const resultats =
    Boolean(recherche) ||
    Boolean(categorie) ||
    tags.length > 0 ||
    Boolean(acces) ||
    Boolean(library);

  const renvoye = lire('offre') === '1' && !etat.hasFullAccess;

  const entete = (
    <div className="space-y-3">
      <h1 className="text-[26px] font-bold leading-tight text-[color:var(--color-night)]">
        Que voulez-vous créer&nbsp;?
      </h1>
      <RechercheAccueil univers={library ?? univers} terme={recherche} partout={partout} />
      <ChoixUnivers actif={library ?? univers} base="/app" />
    </div>
  );

  const query = catalogQuery.parse({
    portee: 'catalogue',
    library,
    categorySlug: categorie,
    tags: tags.length > 0 ? tags : undefined,
    search: recherche,
    access: acces,
  });

  // Les lectures seules dans le `try` : un rendu n'y serait pas rattrape.
  let page: Awaited<ReturnType<typeof getCatalogPage>> | null = null;
  let accueil: {
    offertes: Awaited<ReturnType<typeof getCatalogPage>> | null;
    sommaire: Awaited<ReturnType<typeof getSommaireDeBibliotheque>>;
    copies: Awaited<ReturnType<typeof getDernieresCopies>>;
    selection: Awaited<ReturnType<typeof getCatalogPage>>;
    familles: Awaited<ReturnType<typeof getBibliotheque>>;
    tirage: Awaited<ReturnType<typeof getVisuelsTournants>>;
  } | null = null;
  let injoignable = false;

  try {
    if (resultats) {
      page = await getCatalogPage({ ...query, page: 1, pageSize: CATALOG_PAGE_SIZE });
    } else {
      const [offertes, sommaire, copies, selection, familles, tirage] = await Promise.all([
        etat.hasFullAccess
          ? Promise.resolve(null)
          : getCatalogPage(
              catalogQuery.parse({
                portee: 'catalogue',
                library: univers,
                access: 'gratuit',
                page: 1,
                pageSize: 8,
              }),
            ),
        getSommaireDeBibliotheque(univers),
        // L'historique n'existe que pour un compte.
        etat.isMember ? getDernieresCopies(30) : Promise.resolve([]),
        getCatalogPage(
          catalogQuery.parse({
            portee: 'catalogue',
            library: univers,
            page: 1,
            pageSize: CATALOG_PAGE_SIZE,
          }),
        ),
        getBibliotheque(),
        getVisuelsTournants(),
      ]);
      accueil = { offertes, sommaire, copies, selection, familles, tirage };
    }
  } catch (error) {
    // Un catalogue injoignable n'est pas un catalogue vide.
    if (!isCatalogUnavailable(error)) throw error;
    injoignable = true;
  }

  if (injoignable) {
    return (
      <div className="space-y-4 pt-1">
        {entete}
        <NetworkError />
      </div>
    );
  }

  if (page) {
    const selection: SelectionAccueil = { library, categorie, tags, recherche };
    return (
      <div className="space-y-4 pt-1">
        {renvoye ? <PaywallAutoOpen /> : null}
        {entete}
        <FiltreDepliant facettes={facettes} selection={selection} resultats={page.total} />
        <GalerieInfinie
          premieres={page.items}
          critere={{
            library,
            categorySlug: categorie,
            tags: tags.length > 0 ? tags : undefined,
            search: recherche,
            access: acces,
          }}
          encore={page.hasMore}
          locked={!etat.hasFullAccess}
          visiteur={!etat.isMember}
          emptyState={
            <AucunResultat
              terme={query.search}
              bibliotheque={library}
              famille={
                categorie
                  ? (facettes.familles.find((f) => f.slug === categorie)?.nom ?? null)
                  : null
              }
            />
          }
        />
      </div>
    );
  }

  const { offertes, sommaire, copies, selection, familles, tirage } = accueil!;
  const rayons = traitsDesRayons(familles);
  const nom = LIBRARY_LABELS[univers];
  const recentes = copies.filter((carte) => carte.library === univers).slice(0, 10);
  // Hors Visuels, une collection n'emprunte pas de photographie : ses
  // commandes rendent du texte, et une photo mentirait sur le resultat.
  const collections = sommaire.collections.slice(0, 10).map((collection) => ({
    ...collection,
    apercuUrl:
      univers === 'images'
        ? visuelDeCollection(collection.apercuUrl, collection.slug, tirage)
        : collection.apercuUrl,
  }));

  return (
    <div className="space-y-6 pt-1">
      {renvoye ? <PaywallAutoOpen /> : null}
      {entete}

      {offertes && offertes.items.length > 0 ? (
        <section className="space-y-2.5">
          <TitreDeSection
            titre="Commencer gratuitement"
            icone={<IconeTendances />}
            href={`/app?bibliotheque=${univers}&acces=gratuit`}
            action="Voir tout"
          />
          <PromptGrid
            prompts={offertes.items}
            locked={!etat.hasFullAccess}
            visiteur={!etat.isMember}
            disposition="rangee"
            rayons={rayons}
            emptyState={null}
          />
        </section>
      ) : null}

      {collections.length > 0 ? (
        <section className="space-y-2.5">
          <TitreDeSection
            titre="Collections à explorer"
            icone={<IconeCollections />}
            href={`/app/bibliotheque?univers=${univers}`}
            action="Toutes"
          />
          <CollectionsPopulaires collections={collections} />
        </section>
      ) : null}

      {recentes.length > 0 ? (
        <section className="space-y-2.5">
          <TitreDeSection
            titre="Copiées récemment"
            icone={<IconeRecemment />}
            href="/app/recents"
            action="Tout l’historique"
          />
          <PromptGrid
            prompts={recentes}
            locked={!etat.hasFullAccess}
            visiteur={!etat.isMember}
            disposition="rangee"
            prioritaire={false}
            rayons={rayons}
            emptyState={null}
          />
        </section>
      ) : null}

      <section className="space-y-2.5">
        <TitreDeSection titre={`À découvrir en ${nom}`} icone={<IconeCollections />} />
        <GalerieInfinie
          premieres={selection.items}
          critere={{ library: univers }}
          encore={selection.hasMore}
          locked={!etat.hasFullAccess}
          visiteur={!etat.isMember}
          rayons={rayons}
          emptyState={
            <p className="py-6 text-center text-[length:var(--texte-corps)] text-[color:var(--color-muted)]">
              Aucune commande publiée en {nom} pour le moment.
            </p>
          }
        />
      </section>
    </div>
  );
}
