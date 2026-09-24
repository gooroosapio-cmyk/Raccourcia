import { cookies } from 'next/headers';
import { getSommaireDeBibliotheque } from '@/lib/catalog/sommaire';
import { getVisuelsTournants, visuelDeCollection } from '@/lib/catalog/visuels';
import { RechercheBibliotheque } from '@/components/library/recherche-bibliotheque';
import { ChoixUnivers } from '@/components/accueil/choix-univers';
import { Mosaique, type CarteDeMosaique } from '@/components/library/mosaique';
import { NetworkError } from '@/components/ui/network-error';
import { EmptyState } from '@/components/ui/states';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
import {
  COOKIE_UNIVERS,
  LIBRARIES,
  LIBRARY_LABELS,
  UNIVERS_PAR_DEFAUT,
  type Library,
} from '@/lib/constants';

export const metadata = { title: 'Bibliothèque' };

const estUnivers = (valeur: unknown): valeur is Library => LIBRARIES.includes(valeur as Library);

/**
 * La Bibliotheque : univers, puis collections.
 *
 * Le rapport de refonte (23 septembre 2026) : trois boutons compacts qui
 * servent d'onglets, puis les collections de l'univers choisi — couverture,
 * titre, nombre de commandes. Pas de description repetee sous chaque tuile,
 * et plus de tuiles de tags melees aux collections : un tag est un attribut
 * d'une commande, il s'atteint depuis la commande (#tag), pas comme un
 * rayon de plus.
 *
 * L'univers suit la meme regle que l'accueil : celui de l'adresse, sinon le
 * dernier choisi, sinon Visuels.
 */
export default async function BibliothequePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const demande = (await searchParams).univers;
  const retenu = (await cookies()).get(COOKIE_UNIVERS)?.value;
  const univers: Library = estUnivers(demande)
    ? demande
    : estUnivers(retenu)
      ? retenu
      : UNIVERS_PAR_DEFAUT;

  let sommaire: Awaited<ReturnType<typeof getSommaireDeBibliotheque>> | null = null;
  let tirage: Awaited<ReturnType<typeof getVisuelsTournants>> = new Map();
  try {
    [sommaire, tirage] = await Promise.all([
      getSommaireDeBibliotheque(univers),
      getVisuelsTournants(),
    ]);
  } catch (error) {
    if (!isCatalogUnavailable(error)) throw error;
  }

  const entete = (
    <>
      <Titre />
      <RechercheBibliotheque />
      <ChoixUnivers actif={univers} base="/app/bibliotheque" />
    </>
  );

  if (!sommaire) {
    return (
      <div className="space-y-4 pt-1">
        {entete}
        <NetworkError />
      </div>
    );
  }

  // Hors Visuels, une collection n'emprunte pas de photographie : ses
  // commandes rendent du texte, et une photo mentirait sur le resultat.
  const cartes: CarteDeMosaique[] = sommaire.collections.map((collection) => ({
    cle: `c-${collection.slug}`,
    slug: collection.slug,
    genre: 'collection' as const,
    href: `/app/bibliotheque/${collection.slug}`,
    titre: collection.nom,
    detail: `${collection.total} commande${collection.total > 1 ? 's' : ''}`,
    famille: collection.famille,
    imageUrl:
      univers === 'images'
        ? visuelDeCollection(collection.apercuUrl, collection.slug, tirage)
        : collection.apercuUrl,
  }));

  return (
    <div className="space-y-4 pt-1">
      {entete}

      {cartes.length === 0 ? (
        <EmptyState
          title={`Aucune collection en ${LIBRARY_LABELS[univers]}`}
          body="Aucune commande n’y est publiée pour le moment."
        />
      ) : (
        <Mosaique cartes={cartes} />
      )}
    </div>
  );
}

function Titre() {
  return (
    <h1 className="text-[length:var(--texte-page)] font-bold leading-tight text-[color:var(--color-night)]">
      Bibliothèque
    </h1>
  );
}
