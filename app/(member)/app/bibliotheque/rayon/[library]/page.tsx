import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSommaireDeBibliotheque } from '@/lib/catalog/sommaire';
import { getCollectionsFavorites, getTagsFavoris } from '@/lib/catalog/tags-favoris';
import { getVisuelsTournants, visuelDeCollection, visuelDeTag } from '@/lib/catalog/visuels';
import { getAccessState } from '@/lib/access/entitlement';
import { Mosaique, type CarteDeMosaique } from '@/components/library/mosaique';
import { FiltreDeCategories } from '@/components/library/filtre-de-categories';
import { NetworkError } from '@/components/ui/network-error';
import { EmptyState } from '@/components/ui/states';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
import { LIBRARIES, LIBRARY_LABELS, LIBRARY_PROMESSES, type Library } from '@/lib/constants';

export async function generateMetadata({ params }: { params: Promise<{ library: string }> }) {
  const { library } = await params;
  return {
    title: LIBRARIES.includes(library as Library)
      ? LIBRARY_LABELS[library as Library]
      : 'Bibliothèque',
  };
}

/**
 * Le sommaire d'une bibliotheque.
 *
 * Toucher « Images » menait a l'accueil filtre : mille cartes a la suite.
 * C'est une bonne reponse quand on sait ce qu'on cherche, et un mur quand
 * on vient se reperer — or c'est precisement pour se reperer qu'on touche
 * le nom d'une bibliotheque.
 *
 * Cette page repond a l'autre question : qu'y a-t-il la-dedans ? Ses
 * collections et ses tags, en cartes illustrees, sans intitule de famille.
 * Le pouce choisit une porte plutot que de descendre un mur.
 *
 * « Tout voir » reste en bas, pour qui voulait bien le mur.
 */
export default async function RayonPage({ params }: { params: Promise<{ library: string }> }) {
  const { library: demandee } = await params;

  // Liste fermee : une bibliotheque inventee dans l'adresse ne mene nulle
  // part plutot que de rendre un sommaire vide.
  if (!LIBRARIES.includes(demandee as Library)) notFound();
  const library = demandee as Library;

  let sommaire: Awaited<ReturnType<typeof getSommaireDeBibliotheque>>;
  let tirage: Awaited<ReturnType<typeof getVisuelsTournants>>;
  let epingles: Awaited<ReturnType<typeof getTagsFavoris>>;
  let rayonsEpingles: Awaited<ReturnType<typeof getCollectionsFavorites>>;
  let membre: boolean;
  try {
    const [acces, lot, visuels, favoris, collectionsFavorites] = await Promise.all([
      getAccessState(),
      getSommaireDeBibliotheque(library),
      getVisuelsTournants(),
      getTagsFavoris(),
      getCollectionsFavorites(),
    ]);
    membre = acces.isMember;
    sommaire = lot;
    tirage = visuels;
    epingles = favoris;
    rayonsEpingles = collectionsFavorites;
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

  // Les rayons epingles d'abord : c'est le seul ordre que le membre a
  // choisi lui-meme, et il doit survivre au classement du catalogue.
  const tags = [...sommaire.tags]
    .sort((a, b) => Number(epingles.has(b.slug)) - Number(epingles.has(a.slug)))
    .slice(0, 24);

  sommaire.collections.sort(
    (a, b) => Number(rayonsEpingles.has(b.slug)) - Number(rayonsEpingles.has(a.slug)),
  );

  const compter = (total: number) => `${total} commande${total > 1 ? 's' : ''}`;

  // UN RAYON DE TEXTES N'EMPRUNTE PAS DE PHOTOGRAPHIE.
  //
  // Le tirage remplit les cadres vides en piochant un visuel « apres » parmi
  // les commandes qui portent le tag. Un tag traverse les bibliotheques : sur
  // « Personnage » ou « Analyse », les commandes illustrees sont des commandes
  // IMAGE, et leur photo se retrouvait en couverture d'un rayon de Reflexions.
  // Mesure sur le catalogue : 5 tags sur 18 en Reflexions, 3 sur 31 en Textes.
  //
  // Ce n'est pas seulement incongru, c'est faux : la couverture d'un rayon se
  // lit comme un exemple de ce qu'il rend, et ces rayons-la ne rendent pas
  // d'image. Le motif typographique de `FondDeRayon` dit la verite, et la
  // description du rayon fait le reste du travail.
  //
  // L'image DEPOSEE par l'administration passe toujours : elle, quelqu'un l'a
  // choisie pour ce rayon-la.
  const photosEmpruntables = library === 'images';

  const cartes: CarteDeMosaique[] = [
    ...sommaire.collections.map((collection) => ({
      cle: `c-${collection.slug}`,
      slug: collection.slug,
      genre: 'collection' as const,
      href: `/app/bibliotheque/${collection.slug}`,
      titre: collection.nom,
      // La phrase du rayon quand elle existe, son compte sinon : sur les
      // Textes, il n'y a pas d'image a emprunter et un compteur seul ne
      // fait choisir personne.
      detail: collection.description ?? compter(collection.total),
      famille: collection.famille,
      imageUrl: visuelDeCollection(collection.apercuUrl, collection.slug, tirage),
      ...(membre ? { epingle: rayonsEpingles.has(collection.slug) } : {}),
    })),
    ...tags.map((tag) => ({
      cle: `t-${tag.slug}`,
      slug: tag.slug,
      genre: 'tag' as const,
      href: `/app/bibliotheque/tag/${tag.slug}`,
      titre: tag.nom,
      detail: tag.description ?? compter(tag.total),
      imageUrl: photosEmpruntables
        ? visuelDeTag(tag.imageUrl, tag.slug, tirage)
        : // Hors de la bibliotheque Images, seule l'image DEPOSEE compte.
          // Voir `photosEmpruntables` ci-dessus.
          tag.imageUrl,
      ...(membre ? { epingle: epingles.has(tag.slug) } : {}),
    })),
  ];

  return (
    <div className="space-y-4 pt-1">
      <div>
        {/* Le chemin de retour nomme ou l'on va, pas « retour » : on sait
            d'ou l'on vient sans avoir a se souvenir du geste. */}
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
          {LIBRARY_LABELS[library]}
        </h1>
        <p className="mt-0.5 text-[length:var(--texte-carte)] leading-snug text-[color:var(--color-muted)]">
          {LIBRARY_PROMESSES[library]}
        </p>
      </div>

      {cartes.length === 0 ? (
        <EmptyState
          title="Cette bibliothèque est vide"
          body="Aucune commande n’y est publiée pour le moment."
          actionLabel="Revenir à la bibliothèque"
          actionHref="/app/bibliotheque"
        />
      ) : (
        <>
          {/* LE FILTRE, SUR LES DEUX ETAGERES OU IL MANQUE.
              Une etagere d'Images se parcourt a l'oeil : on reconnait un
              rayon a sa photographie. Sur du texte il n'y a que des mots, et
              trente cartes sans ordre apparent obligent a lire la page
              entiere pour trouver « Produire un contenu ». Les categories
              existent pourtant — quatre ici, quatre en Reflexions — et
              n'etaient affichees nulle part.

              Images garde la mosaique nue : dix-neuf categories y feraient
              un rail plus long que ce qu'il resserre. Le passage se fait en
              un mot le jour ou l'on en veut un la aussi. */}
          {library === 'images' ? (
            <Mosaique cartes={cartes} />
          ) : (
            <FiltreDeCategories cartes={cartes} />
          )}

          <Link
            href={`/app?bibliotheque=${library}`}
            className="flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[15px] font-medium text-[color:var(--color-night)]"
          >
            Voir toutes les commandes
          </Link>
        </>
      )}
    </div>
  );
}
