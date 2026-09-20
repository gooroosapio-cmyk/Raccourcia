import { getAccessState } from '@/lib/access/entitlement';
import {
  getBibliotheque,
  getCatalogPage,
  getDernieresCopies,
  getVivierDuFeed,
} from '@/lib/catalog/queries';
import { getFacettes } from '@/lib/catalog/filtres';
import { getCollectionsPopulaires } from '@/lib/catalog/accueil';
import { ordonnerLeFeed } from '@/lib/catalog/feed';
import type { PromptCard } from '@/lib/catalog/types';
import { AccueilEditorial } from '@/components/discovery/accueil-editorial';
import { FiltreDepliant, type SelectionAccueil } from '@/components/discovery/filtre-depliant';
import { AucunResultat } from '@/components/discovery/aucun-resultat';
import { GalerieInfinie } from '@/components/cards/galerie-infinie';
import { PaywallAutoOpen } from '@/components/paywall/paywall-provider';
import { catalogQuery } from '@/lib/validation/schemas';
import { NetworkError } from '@/components/ui/network-error';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
import { CATALOG_PAGE_SIZE, LIBRARIES, type Library } from '@/lib/constants';

export const metadata = { title: 'Accueil' };

/** Cinq tags au plus : au-dela, le croisement ne rend plus jamais rien. */
const TAGS_MAX = 5;

/**
 * Dans quoi l'accueil tire, et combien il en montre.
 *
 * Le tirage est volontairement plus large que l'affichage : c'est l'ecart
 * entre les deux qui fait qu'une visite ne ressemble pas a la precedente.
 * Trop large, il couterait une lecture inutile a chaque ouverture ; trois
 * fois ce qu'on montre suffit a ne pas revoir la meme page deux fois.
 */
const VIVIER_TIRAGE = 180;
const VIVIER_MONTRE = 60;

/**
 * L'accueil : une galerie, et un filtre replie au-dessus.
 *
 * Rendu au serveur. Le client ne recoit que les metadonnees publiques,
 * jamais le contenu complet d'une commande.
 *
 * Deux etats pour un seul ecran. Tant que rien n'est filtre, l'accueil
 * presente : selection du moment, collections, reprise. Des qu'une facette
 * est cochee, il redevient une liste de resultats. Le meme filtre coiffe les
 * deux, et c'est lui qui fait passer de l'un a l'autre.
 */
export default async function AccueilPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const lire = (cle: string) => (typeof params[cle] === 'string' ? params[cle] : undefined);

  // La bibliotheque remplace l'ancien selecteur Image/Texte. Une valeur
  // inconnue arrivant par l'URL est ignoree, jamais transmise a la requete.
  const demandee = lire('bibliotheque');
  const library = LIBRARIES.includes(demandee as Library) ? (demandee as Library) : undefined;

  // Les tags voyagent separes par des virgules : c'est la forme la plus
  // courte, et elle se relit a l'oeil dans une adresse partagee.
  const tags = (lire('tags') ?? '')
    .split(',')
    .map((entree) => entree.trim())
    .filter(Boolean)
    .slice(0, TAGS_MAX);

  let acces: Awaited<ReturnType<typeof getAccessState>>;
  let facettes: Awaited<ReturnType<typeof getFacettes>>;
  try {
    [acces, facettes] = await Promise.all([getAccessState(), getFacettes(library ?? null)]);
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

  // Une famille demandee qui n'existe plus — un lien partage avant une
  // refonte, un favori du navigateur — ne doit pas rendre un ecran vide qui
  // parle d'un rayon que personne ne voit. Elle est simplement ignoree.
  const connues = new Set(facettes.familles.map((famille) => famille.slug));
  const demandeeCategorie = lire('categorie');
  const categorie =
    demandeeCategorie && connues.has(demandeeCategorie) ? demandeeCategorie : undefined;

  const ia = facettes.ias.some((entree) => entree.cle === lire('ia')) ? lire('ia') : undefined;
  const recherche = lire('q');

  const selection: SelectionAccueil = { library, categorie, tags, ia, recherche };

  const editorial = !library && !categorie && tags.length === 0 && !ia && !recherche;

  // Zod filtre les valeurs inconnues : un parametre d'URL bricole ne peut ni
  // atteindre la requete, ni faire echouer la page.
  //
  // `portee: 'catalogue'` toujours : la bibliotheque a remplace le domaine
  // comme premier niveau de rangement, et borner en plus au mode ferait
  // disparaitre les Modes IA d'une recherche lancee depuis les Images.
  const query = catalogQuery.parse({
    portee: 'catalogue',
    library,
    categorySlug: categorie,
    tags: tags.length > 0 ? tags : undefined,
    search: recherche,
    provider: ia,
  });

  // Un seul lot ici : la galerie s'allonge d'elle-meme cote client, lot par
  // lot, a mesure qu'on descend. La page n'a plus a deviner combien de
  // cartes l'utilisateur voudra voir — elle en rend un ecran et laisse la
  // suite venir.
  const requete = { ...query, page: 1, pageSize: CATALOG_PAGE_SIZE };

  let page: Awaited<ReturnType<typeof getCatalogPage>>;
  let accueil: {
    feed: PromptCard[];
    reprendre: Awaited<ReturnType<typeof getDernieresCopies>>;
    familles: Awaited<ReturnType<typeof getBibliotheque>>;
    collections: Awaited<ReturnType<typeof getCollectionsPopulaires>>;
  } | null = null;

  try {
    if (editorial) {
      // L'historique n'existe que pour un compte : le demander a un visiteur
      // revient a interroger une table qui lui est fermee.
      // Un vivier plus large que ce qu'on montre : c'est ce qui donne au
      // melange de quoi varier. Tire dans soixante cartes, il rendrait
      // toujours les memes soixante, dans un autre ordre.
      const [vivier, familles, reprendre, collections] = await Promise.all([
        getVivierDuFeed(VIVIER_TIRAGE, { garder: VIVIER_MONTRE }),
        getBibliotheque(),
        acces.isMember ? getDernieresCopies() : Promise.resolve([]),
        // Dix collections : de quoi remplir une rangee qui defile sans en
        // faire un sommaire.
        getCollectionsPopulaires(10),
      ]);

      accueil = {
        // Une seule galerie, et non une vitrine puis une galerie : c'est
        // `ordonnerLeFeed` qui alterne les rayons et glisse un mode ou un
        // parcours toutes les quatre cartes.
        //
        // Le vivier arrive deja melange : la lecture tire large, rend
        // court, et change d'un passage a l'autre. L'ordonnancement se
        // pose par-dessus — l'inverse deferait ses regles.
        feed: ordonnerLeFeed(vivier),
        familles,
        reprendre,
        collections,
      };
      page = { items: [], hasMore: false, total: 0 };
    } else {
      page = await getCatalogPage(requete);
    }
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

  // Renvoi depuis un espace reserve : c'est le serveur qui a pose le
  // parametre, c'est donc lui qui decide d'ouvrir la fenetre.
  const renvoye = lire('offre') === '1' && !acces.hasFullAccess;

  return (
    <div className="space-y-3 pt-1">
      {renvoye ? <PaywallAutoOpen /> : null}

      {/* Une affirmation, pas une question : la question appelait une reponse
          dans un champ qui n'est plus la. Hors accueil d'arrivee, le titre
          reste invisible — la liste se lit d'un coup d'oeil, mais un lecteur
          d'ecran a besoin d'un premier repere. */}
      {editorial ? (
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-[color:var(--color-night)]">
            Que voulez-vous créer&nbsp;?
          </h1>
          <p className="mt-1 text-[length:var(--texte-carte)] leading-snug text-[color:var(--color-muted)]">
            Une idée, une commande, à vous de jouer.
          </p>
        </div>
      ) : (
        <h1 className="sr-only">Bibliothèque de commandes RaccourcIA</h1>
      )}

      {/* LE FILTRE N'EST PLUS EN TETE D'ACCUEIL.
          Il demandait de savoir ce qu'on cherchait avant d'avoir rien vu :
          une barre de reglages au-dessus d'une page dont le role est de
          montrer. La Bibliotheque range, l'accueil propose. Le filtre reste
          la ou une selection est deja en cours — sans lui, on ne saurait
          plus ni ce qui est coche ni comment le decocher. */}
      {editorial ? null : (
        <FiltreDepliant facettes={facettes} selection={selection} resultats={page.total} />
      )}

      {accueil ? (
        <AccueilEditorial
          feed={accueil.feed}
          reprendre={accueil.reprendre}
          familles={accueil.familles}
          collections={accueil.collections}
          locked={!acces.hasFullAccess}
          visiteur={!acces.isMember}
        />
      ) : (
        <GalerieInfinie
          premieres={page.items}
          critere={{
            library,
            categorySlug: categorie,
            tags: tags.length > 0 ? tags : undefined,
            // `ia` a deja ete confronte aux facettes ; Zod le revalide de
            // toute facon a l'arrivee de l'action.
            provider: query.provider,
            search: recherche,
          }}
          encore={page.hasMore}
          locked={!acces.hasFullAccess}
          visiteur={!acces.isMember}
          emptyState={
            <AucunResultat
              terme={query.search}
              bibliotheque={library}
              // Une selection qui ne rend rien dans un rayon peut rendre
              // quelque chose ailleurs : on propose d'elargir plutot que de
              // laisser croire que la commande n'existe pas.
              famille={
                categorie
                  ? (facettes.familles.find((f) => f.slug === categorie)?.nom ?? null)
                  : null
              }
            />
          }
        />
      )}
    </div>
  );
}
