import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAccessState } from '@/lib/access/entitlement';
import { getBibliotheque, getCatalogPage } from '@/lib/catalog/queries';
import { CollectionTile } from '@/components/library/collection-tile';
import { ListeDesFacons } from '@/components/library/liste-des-facons';
import { NetworkError } from '@/components/ui/network-error';
import { EmptyState } from '@/components/ui/states';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
import { nomCourtDuRayon } from '@/lib/catalog/facons';
import { FAMILLE_MODES_IA, FAMILLE_PARCOURS } from '@/lib/catalog/familles-speciales';
import { iconeDuRayon, iconeDuRole } from '@/lib/ui/icones';
import { MODES, type Mode } from '@/lib/constants';
import type { LibraryFamily } from '@/lib/catalog/types';

/**
 * Une famille : ses rayons, ou directement ce qu'elle contient.
 *
 * Les six familles d'images se parcourent rayon par rayon — « Portraits &
 * souvenirs » compte cinq rayons et deux cents commandes, les montrer toutes
 * d'un coup n'aiderait personne.
 *
 * Les Modes IA et les Parcours, non. Cette page y affichait sept tuiles
 * bleues et deux tuiles bleues : on arrivait sur un ecran qui ne contenait
 * aucun mode et aucun parcours, et il fallait un second geste pour en voir un
 * seul. Leurs sous-familles sont devenues des puces de filtre au-dessus de la
 * liste — ce qu'elles auraient toujours du etre.
 *
 * La distinction ne tient qu'aux deux identifiants du classeur. Tout le reste
 * — noms, ordre, contenu — continue de venir de la base.
 */
export async function generateMetadata({ params }: { params: Promise<{ famille: string }> }) {
  const { famille } = await params;
  const familles = await getBibliotheque().catch(() => []);
  return { title: familles.find((f) => f.slug === famille)?.name ?? 'Catégorie' };
}

/** Ce que la page annonce sous le titre, selon ce qu'on y fait. */
const PROMESSES: Record<string, string> = {
  [FAMILLE_MODES_IA]: 'Un partenaire pour réfléchir et avancer.',
  [FAMILLE_PARCOURS]: 'Avancez d’un objectif aux livrables.',
};

export default async function FamillePage({
  params,
  searchParams,
}: {
  params: Promise<{ famille: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { famille: slug } = await params;
  const recherche = await searchParams;

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

  const directe = slug === FAMILLE_MODES_IA || slug === FAMILLE_PARCOURS;

  return (
    <div className="space-y-4 pt-1">
      <Entete famille={famille} promesse={PROMESSES[slug]} />

      {directe ? (
        <ListeDirecte
          famille={famille}
          genre={slug === FAMILLE_MODES_IA ? 'mode_ia' : 'parcours'}
          rayonInitial={typeof recherche.rayon === 'string' ? recherche.rayon : null}
        />
      ) : (
        <GrilleDesRayons famille={famille} />
      )}
    </div>
  );
}

function Entete({ famille, promesse }: { famille: LibraryFamily; promesse?: string }) {
  return (
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

      {/* La promesse de l'ecran quand il en a une, sinon ce que la famille dit
          d'elle-meme en base. Jamais les deux : elles diraient la meme chose
          deux fois. */}
      {(promesse ?? famille.description) ? (
        <p className="mt-1 text-[length:var(--texte-carte)] leading-[1.45] text-[color:var(--color-muted)]">
          {promesse ?? famille.description}
        </p>
      ) : null}
    </div>
  );
}

/** Les rayons d'une famille d'images, en tuiles. */
function GrilleDesRayons({ famille }: { famille: LibraryFamily }) {
  // Toutes, et sans bouton. Le palier intermediaire economisait un ecran de
  // defilement et coutait un geste : on entrait dans une famille pour se voir
  // proposer d'en voir le reste.
  const montrees = famille.collections.filter((collection) => collection.count > 0);

  return (
    <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 min-[400px]:gap-[var(--gouttiere-carte)]">
      {montrees.map((collection) => (
        <CollectionTile key={collection.id} tile={collection} famille={famille.name} />
      ))}
    </div>
  );
}

/**
 * Tous les modes, ou tous les parcours, en une fois.
 *
 * Une seule lecture : quatre-vingt-deux modes et vingt-huit parcours tiennent
 * largement dans la limite d'une page de catalogue, et les paginer obligerait
 * a charger la suite avant de pouvoir chercher dedans.
 */
async function ListeDirecte({
  famille,
  genre,
  rayonInitial,
}: {
  famille: LibraryFamily;
  genre: 'mode_ia' | 'parcours';
  rayonInitial: string | null;
}) {
  const [acces, page] = await Promise.all([
    getAccessState(),
    getCatalogPage({
      mode: MODES.includes(famille.mode as Mode) ? (famille.mode as Mode) : MODES[0]!,
      categorySlug: famille.slug,
      sort: 'populaires',
      portee: 'domaine',
      page: 1,
      // De quoi tenir la famille entiere : la liste se filtre dans la page,
      // ce qui suppose de l'avoir entiere.
      pageSize: 240,
    }),
  ]);

  if (page.items.length === 0) {
    return (
      <EmptyState
        title="Rien à afficher"
        body="Aucune entrée n’est ouverte pour le moment dans cette famille."
      />
    );
  }

  // Les puces : les rayons de la famille, dans l'ordre du catalogue, delestes
  // du mot que le titre vient de dire.
  const rayons = famille.collections
    .filter((collection) => collection.count > 0)
    .map((collection) => ({
      slug: collection.slug,
      name: nomCourtDuRayon(collection.name, famille.name),
    }));

  // Les traits sont resolus ici : les soixante-douze du kit vivent dans un
  // seul objet, et y toucher depuis le navigateur les y ferait tous entrer.
  const icones: Record<string, string> = {};
  for (const rayon of rayons) {
    const trait = iconeDuRayon(rayon.slug);
    if (trait) icones[rayon.slug] = trait;
  }

  return (
    <ListeDesFacons
      genre={genre}
      cartes={page.items}
      rayons={rayons}
      icones={icones}
      iconeRecherche={iconeDuRole('search')}
      locked={!acces.hasFullAccess}
      visiteur={!acces.isMember}
      rayonInitial={rayonInitial}
    />
  );
}
