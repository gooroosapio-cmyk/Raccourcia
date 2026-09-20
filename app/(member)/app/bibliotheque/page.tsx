import { getTagsExplorables } from '@/lib/catalog/tags';
import { getCollectionsPopulaires } from '@/lib/catalog/accueil';
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

  try {
    // Trente collections : de quoi tenir un sommaire sans le rendre
    // interminable. Les autres s'atteignent par la porte de leur
    // bibliotheque, qui les montre toutes.
    [collections, rayonsDeTags] = await Promise.all([
      getCollectionsPopulaires(30),
      getTagsExplorables(),
    ]);
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

  const tags = rayonsDeTags
    .flatMap((rayon) => rayon.tags)
    .sort((a, b) => b.total - a.total)
    .slice(0, 24);

  // Collections et tags alternes plutot que poses en deux blocs. Deux blocs
  // rendraient le second facultatif : on parcourt le premier, on croit avoir
  // fait le tour, et la moitie des chemins reste derriere le pouce.
  const cartes: CarteDeMosaique[] = entrelacer(
    collections.map((collection) => ({
      cle: `c-${collection.slug}`,
      href: `/app/bibliotheque/${collection.slug}`,
      titre: collection.nom,
      detail: `${collection.total} commande${collection.total > 1 ? 's' : ''}`,
      imageUrl: collection.apercuUrl,
    })),
    tags.map((tag) => ({
      cle: `t-${tag.slug}`,
      href: `/app/bibliotheque/tag/${tag.slug}`,
      titre: tag.nom,
      detail: `${tag.total} commande${tag.total > 1 ? 's' : ''}`,
      imageUrl: tag.imageUrl,
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

function Titre() {
  return (
    <h1 className="text-[length:var(--texte-page)] font-bold leading-tight text-[color:var(--color-night)]">
      Bibliothèque
    </h1>
  );
}
