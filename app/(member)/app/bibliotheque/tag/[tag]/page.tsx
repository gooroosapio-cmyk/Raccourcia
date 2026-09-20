import { notFound } from 'next/navigation';
import { getAccessState } from '@/lib/access/entitlement';
import { getCatalogPage } from '@/lib/catalog/queries';
import { getTag, getTagsExplorables, getTagsVoisins } from '@/lib/catalog/tags';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
import { GalerieInfinie } from '@/components/cards/galerie-infinie';
import { SelectionDeTags } from '@/components/library/selection-de-tags';
import { NetworkError } from '@/components/ui/network-error';
import { EmptyState } from '@/components/ui/states';
import { catalogQuery } from '@/lib/validation/schemas';
import { CATALOG_PAGE_SIZE } from '@/lib/constants';

/** Cinq au plus : au-dela, le croisement ne rend plus jamais rien. */
const TAGS_MAX = 5;

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const trouve = await getTag(tag).catch(() => null);
  return { title: trouve ? trouve.nom : 'Tag' };
}

/**
 * Les commandes qui portent un tag, et de quoi resserrer.
 *
 * Le tag de l'adresse definit la page ; ceux de `?avec=` s'y ajoutent, en ET.
 * Tout est dans l'URL : la selection se partage, le retour arriere la defait
 * un cran a la fois, et rien de cela ne demande de JavaScript.
 */
export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tag: slug } = await params;
  const recherche = await searchParams;
  const lire = (cle: string) =>
    typeof recherche[cle] === 'string' ? (recherche[cle] as string) : undefined;

  let principal: Awaited<ReturnType<typeof getTag>>;
  let acces: Awaited<ReturnType<typeof getAccessState>>;
  try {
    [principal, acces] = await Promise.all([getTag(slug), getAccessState()]);
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

  // Un tag inconnu, ou que plus aucune commande publiee ne porte, n'a pas de
  // page : afficher un rayon vide ferait croire a une selection trop etroite
  // alors que l'adresse elle-meme ne mene nulle part.
  if (!principal) notFound();

  // Le referentiel sert deux fois : de garde — un `?avec=` bricole ne peut
  // pas atteindre la requete — et de source des libelles. Un nom lu dans
  // l'URL s'afficherait sans accent ni majuscule, et changerait a chaque
  // renommage en administration.
  const referentiel = new Map(
    (await getTagsExplorables()).flatMap((rayon) => rayon.tags).map((tag) => [tag.slug, tag]),
  );
  const ajoutes = (lire('avec') ?? '')
    .split(',')
    .map((entree) => entree.trim())
    .filter((entree) => entree !== '' && entree !== slug && referentiel.has(entree))
    .slice(0, TAGS_MAX - 1);

  const selection = [slug, ...ajoutes];

  const query = catalogQuery.parse({
    portee: 'catalogue',
    tags: selection,
  });

  let page: Awaited<ReturnType<typeof getCatalogPage>>;
  let voisins: Awaited<ReturnType<typeof getTagsVoisins>>;
  try {
    [page, voisins] = await Promise.all([
      getCatalogPage({ ...query, page: 1, pageSize: CATALOG_PAGE_SIZE }),
      // Plus rien a proposer une fois la limite atteinte : des puces qui ne
      // repondraient pas au geste valent moins que pas de puces du tout.
      selection.length >= TAGS_MAX ? Promise.resolve([]) : getTagsVoisins(selection),
    ]);
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

  // Les tags deja choisis ne figurent pas parmi les voisins — c'est le
  // propre d'un voisin — donc leurs libelles viennent du referentiel.
  const ajoutesLisibles = ajoutes.map((entree) => {
    const connu = referentiel.get(entree)!;
    return { slug: connu.slug, nom: connu.nom, groupe: connu.groupe, total: connu.total };
  });

  const lien = (slugs: string[]) => {
    const suivants = new URLSearchParams();
    if (slugs.length > 0) suivants.set('avec', slugs.join(','));
    const suffixe = suivants.toString();
    return suffixe ? `/app/bibliotheque/tag/${slug}?${suffixe}` : `/app/bibliotheque/tag/${slug}`;
  };

  return (
    <div className="space-y-4 pt-1">
      <div>
        <h1 className="text-[length:var(--texte-page)] font-bold leading-tight text-[color:var(--color-night)]">
          {principal.nom}
        </h1>
        <p
          aria-live="polite"
          className="mt-0.5 text-[length:var(--texte-carte)] text-[color:var(--color-muted)]"
        >
          {page.total} commande{page.total > 1 ? 's' : ''}
        </p>
      </div>

      <SelectionDeTags
        principal={principal}
        ajoutes={ajoutesLisibles}
        voisins={voisins}
        lien={lien}
      />

      <GalerieInfinie
        premieres={page.items}
        critere={{ tags: selection }}
        encore={page.hasMore}
        locked={!acces.hasFullAccess}
        visiteur={!acces.isMember}
        emptyState={
          <EmptyState
            title="Aucune commande ne porte tous ces tags"
            body="Retirez-en un pour élargir la sélection."
          />
        }
      />
    </div>
  );
}
