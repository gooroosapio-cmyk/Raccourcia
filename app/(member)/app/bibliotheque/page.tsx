import { getTagsExplorables } from '@/lib/catalog/tags';
import { getCollectionsFavorites, getTagsFavoris } from '@/lib/catalog/tags-favoris';
import { getVisuelsTournants, visuelDeCarte } from '@/lib/catalog/visuels';
import { getCollectionsPopulaires } from '@/lib/catalog/accueil';
import { getAccessState } from '@/lib/access/entitlement';
import { RechercheBibliotheque } from '@/components/library/recherche-bibliotheque';
import { NosBibliotheques } from '@/components/accueil/nos-bibliotheques';
import { Mosaique, type CarteDeMosaique } from '@/components/library/mosaique';
import { NetworkError } from '@/components/ui/network-error';
import { EmptyState } from '@/components/ui/states';
import { isCatalogUnavailable } from '@/lib/catalog/errors';

export const metadata = { title: 'Bibliothèque' };

/**
 * La Bibliotheque : trois portes, puis des cartes.
 *
 * Elle empilait quatre facons de ranger la meme chose — les deux « facons
 * d'utiliser », les tags en tuiles, les tags en puces groupees par famille,
 * puis les rayons en accordeons. Quatre sommaires pour un seul catalogue :
 * on ne savait plus lequel lire, et les intitules de groupe — « Rendu »,
 * « Capacite », « Contexte » — sont le vocabulaire du classeur, jamais
 * celui du lecteur.
 *
 * Il n'en reste que deux niveaux. Les trois bibliotheques en tete, parce
 * que c'est la premiere decision : une image, un texte, une conversation.
 * Puis des cartes illustrees — collections et tags melanges, sans intitule
 * de famille — parce que ce sont deux chemins vers la meme etagere et que
 * rien n'oblige a choisir lequel.
 *
 * La recherche reste en tete : c'est la seule de l'application depuis que
 * l'accueil a range la sienne, et mille cartes sans moyen de chercher un
 * nom qu'on connait deja resteraient mille cartes a faire defiler.
 */
export default async function BibliothequePage() {
  let collections: Awaited<ReturnType<typeof getCollectionsPopulaires>>;
  let rayonsDeTags: Awaited<ReturnType<typeof getTagsExplorables>>;
  let tirage: Awaited<ReturnType<typeof getVisuelsTournants>>;
  let epingles: Awaited<ReturnType<typeof getTagsFavoris>>;
  let rayonsEpingles: Awaited<ReturnType<typeof getCollectionsFavorites>>;
  let membre: boolean;

  try {
    // Trente collections : de quoi tenir un sommaire sans le rendre
    // interminable. Les autres s'atteignent par la porte de leur
    // bibliotheque, qui les montre toutes.
    const [acces, lot, rayons, visuels, favoris, collectionsFavorites] = await Promise.all([
      getAccessState(),
      getCollectionsPopulaires(30),
      getTagsExplorables(),
      getVisuelsTournants(),
      getTagsFavoris(),
      getCollectionsFavorites(),
    ]);
    membre = acces.isMember;
    collections = lot;
    rayonsDeTags = rayons;
    tirage = visuels;
    epingles = favoris;
    rayonsEpingles = collectionsFavorites;
  } catch (error) {
    if (isCatalogUnavailable(error)) {
      return (
        <div className="space-y-4 pt-1">
          <Titre />
          <NetworkError />
        </div>
      );
    }
    throw error;
  }

  // Les rayons epingles passent devant, quel que soit leur volume : c'est
  // le seul classement que le membre a choisi lui-meme. Le reste garde
  // l'ordre du catalogue — le plus porte d'abord.
  const tags = rayonsDeTags
    .flatMap((rayon) => rayon.tags)
    .sort((a, b) => {
      const ecart = Number(epingles.has(b.slug)) - Number(epingles.has(a.slug));
      return ecart !== 0 ? ecart : b.total - a.total;
    })
    .slice(0, 24);

  // Collections et tags alternes plutot que poses en deux blocs. Deux blocs
  // rendraient le second facultatif : on parcourt le premier, on croit avoir
  // fait le tour, et la moitie des chemins reste derriere le pouce.
  const cartes: CarteDeMosaique[] = entrelacer(
    collections.map((collection) => ({
      cle: `c-${collection.slug}`,
      slug: collection.slug,
      genre: 'collection' as const,
      href: `/app/bibliotheque/${collection.slug}`,
      titre: collection.nom,
      detail: collection.description ?? compter(collection.total),
      imageUrl: visuelDeCarte(collection.apercuUrl, `collection:${collection.slug}`, tirage),
      ...(membre ? { epingle: rayonsEpingles.has(collection.slug) } : {}),
    })),
    tags.map((tag) => ({
      cle: `t-${tag.slug}`,
      slug: tag.slug,
      genre: 'tag' as const,
      href: `/app/bibliotheque/tag/${tag.slug}`,
      titre: tag.nom,
      detail: tag.description ?? compter(tag.total),
      imageUrl: visuelDeCarte(tag.imageUrl, `tag:${tag.slug}`, tirage),
      // L'etoile n'existe que pour un compte : un visiteur n'a pas de
      // rayon a lui, et la lui montrer serait promettre un geste qui
      // echoue.
      ...(membre ? { epingle: epingles.has(tag.slug) } : {}),
    })),
  );

  return (
    <div className="space-y-5 pt-1">
      <Titre />

      <RechercheBibliotheque />

      <NosBibliotheques />

      {cartes.length === 0 ? (
        <EmptyState
          title="La bibliothèque est vide"
          body="Aucune collection n’est ouverte pour le moment."
        />
      ) : (
        <Mosaique cartes={cartes} />
      )}
    </div>
  );
}

/**
 * Deux listes melees, en alternance, sans perdre la fin de la plus longue.
 *
 * Une alternance stricte s'arreterait a la plus courte ; ce qui reste est
 * pose a la suite plutot que perdu.
 */
function entrelacer(premieres: CarteDeMosaique[], secondes: CarteDeMosaique[]): CarteDeMosaique[] {
  const melange: CarteDeMosaique[] = [];
  const maximum = Math.max(premieres.length, secondes.length);

  for (let i = 0; i < maximum; i += 1) {
    if (premieres[i]) melange.push(premieres[i]!);
    if (secondes[i]) melange.push(secondes[i]!);
  }

  return melange;
}

/** « 32 commandes ». Le repli quand le rayon n'a pas encore de phrase. */
function compter(total: number): string {
  return `${total} commande${total > 1 ? 's' : ''}`;
}

function Titre() {
  return (
    <h1 className="text-[length:var(--texte-page)] font-bold leading-tight text-[color:var(--color-night)]">
      Bibliothèque
    </h1>
  );
}
