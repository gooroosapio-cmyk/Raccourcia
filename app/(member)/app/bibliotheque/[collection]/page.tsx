import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAccessState } from '@/lib/access/entitlement';
import { getBibliotheque, getCatalogPage } from '@/lib/catalog/queries';
import { GalerieInfinie } from '@/components/cards/galerie-infinie';
import { EmptyState } from '@/components/ui/states';
import { NetworkError } from '@/components/ui/network-error';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
import { CATALOG_PAGE_SIZE, MODES, type Mode } from '@/lib/constants';
import { estUneFamilleSpeciale } from '@/lib/catalog/familles-speciales';

/**
 * Une collection, et les commandes qu'elle contient.
 *
 * Le troisieme palier de la Bibliotheque : famille, collection, commandes.
 * La page ne repropose ni recherche ni filtres — on vient d'y entrer par un
 * choix, et le refaire ici serait revenir sur ses pas.
 */
export async function generateMetadata({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  const familles = await getBibliotheque().catch(() => []);
  const trouvee = familles
    .flatMap((famille) => famille.collections)
    .find((tuile) => tuile.slug === collection);
  return { title: trouvee?.name ?? 'Collection' };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;

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

  const famille = familles.find((f) => f.collections.some((c) => c.slug === collection));
  const tuile = famille?.collections.find((c) => c.slug === collection);
  if (!famille || !tuile) notFound();

  // Les sous-familles de Modes IA et de Parcours ne sont plus une etape de
  // navigation : leur liste se filtre au-dessus des cartes. Une adresse
  // partagee avant ce changement mene donc a la liste, avec sa famille deja
  // retenue — plutot qu'a une page qui montrerait la meme chose autrement.
  //
  // Redirection simple et non permanente : c'est une decision de presentation,
  // pas un changement d'adresse definitif, et la collection existe toujours.
  if (estUneFamilleSpeciale(famille.slug)) {
    redirect(`/app/bibliotheque/famille/${famille.slug}?rayon=${encodeURIComponent(collection)}`);
  }

  const [acces, page] = await Promise.all([
    getAccessState(),
    getCatalogPage({
      // `app_mode` porte encore « analyse », que la validation du catalogue
      // n'accepte pas : on retombe sur le premier mode plutot que de laisser
      // une famille heritee faire echouer la page.
      mode: MODES.includes(famille.mode as Mode) ? (famille.mode as Mode) : MODES[0]!,
      categorySlug: collection,
      // L'ordre du catalogue : c'est le classeur qui decide de ce qui vient
      // en premier dans une collection, pas la popularite du moment.
      sort: 'populaires',
      // Une collection est un rayon : on y reste.
      portee: 'domaine',
      page: 1,
      pageSize: CATALOG_PAGE_SIZE,
    }),
  ]);

  return (
    <div className="space-y-3 pt-1">
      <div>
        {/* Le chemin de retour nomme la famille : on sait d'ou l'on vient
            sans avoir a se souvenir du geste qui a mene ici. */}
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
          {famille.name}
        </Link>

        <h1 className="mt-1 text-[length:var(--texte-page)] font-bold leading-tight text-[color:var(--color-night)]">
          {tuile.name}
        </h1>
        <p className="mt-0.5 text-[length:var(--texte-carte)] text-[color:var(--color-muted)]">
          {page.total} commande{page.total > 1 ? 's' : ''}
        </p>
      </div>

      <GalerieInfinie
        premieres={page.items}
        critere={{ collectionSlug: collection }}
        encore={page.hasMore}
        locked={!acces.hasFullAccess}
        visiteur={!acces.isMember}
        emptyState={
          <EmptyState
            title="Cette collection est vide"
            body="Aucune commande n’y est publiée pour le moment."
            actionLabel="Revenir à la bibliothèque"
            actionHref="/app/bibliotheque"
          />
        }
      />
    </div>
  );
}
