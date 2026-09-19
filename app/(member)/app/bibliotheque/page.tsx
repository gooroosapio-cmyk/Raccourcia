import { getBibliotheque } from '@/lib/catalog/queries';
import { getTagsExplorables } from '@/lib/catalog/tags';
import { ExplorationParTags } from '@/components/library/exploration-par-tags';
import { CollectionTile } from '@/components/library/collection-tile';
import { RayonsDepliables, type RayonDepliable } from '@/components/library/rayons-depliables';
import { FaconsDUtiliser } from '@/components/library/facons-d-utiliser';
import { NetworkError } from '@/components/ui/network-error';
import { EmptyState } from '@/components/ui/states';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
import { iconeDeLaFamille } from '@/lib/ui/icones';
import {
  FAMILLE_MODES_IA,
  FAMILLE_PARCOURS,
  famillesDeRayon,
  familleSpeciale,
} from '@/lib/catalog/familles-speciales';

export const metadata = { title: 'Bibliothèque' };

/**
 * La Bibliotheque : les deux facons de se servir de l'outil, les tags, puis
 * les rayons.
 *
 * L'exploration par tags passe devant. Un rayon range une commande a une
 * place et une seule : un portrait vintage en studio vit dans « Portraits »,
 * et rien dans l'arbre ne permettait de partir de « vintage » ni de
 * « studio ». Les tags se croisent, donc ils repondent a la facon dont on
 * cherche reellement.
 *
 * Les rayons restent, en dessous et replies. Ils portent les descriptions et
 * les dessins du kit, et ils sont la seule entree qui montre la forme du
 * catalogue d'un coup d'oeil — mais ce n'est plus par eux qu'on entre.
 *
 * Les tuiles sont rendues ici, au serveur, et passees deja faites au
 * composant qui les deplie. Leurs dessins viennent du kit et pesent ensemble
 * cinquante kilo-octets : les faire resoudre par le navigateur reviendrait a
 * lui envoyer les cinquante pour en afficher six.
 *
 * Les familles viennent de la base, jamais d'une liste ecrite ici : en
 * ajouter une en administration la fait apparaitre sans redeploiement.
 */
export default async function BibliothequePage() {
  let familles: Awaited<ReturnType<typeof getBibliotheque>>;
  let rayonsDeTags: Awaited<ReturnType<typeof getTagsExplorables>>;

  try {
    [familles, rayonsDeTags] = await Promise.all([getBibliotheque(), getTagsExplorables()]);
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

  const modesIa = familleSpeciale(familles, FAMILLE_MODES_IA);
  const parcours = familleSpeciale(familles, FAMILLE_PARCOURS);

  const rayons: RayonDepliable[] = famillesDeRayon(familles).map((famille) => ({
    id: famille.id,
    slug: famille.slug,
    nom: famille.name,
    icone: iconeDeLaFamille(famille.slug),
    tuiles: famille.collections.map((collection) => (
      <CollectionTile key={collection.id} tile={collection} famille={famille.name} />
    )),
  }));

  return (
    <div className="space-y-5 pt-1">
      <Titre />

      <FaconsDUtiliser modesIa={modesIa} parcours={parcours} />

      <ExplorationParTags rayons={rayonsDeTags} />

      <h2 className="text-[length:var(--texte-section)] font-bold leading-tight text-[color:var(--color-night)]">
        Parcourir par rayon
      </h2>

      {rayons.length === 0 ? (
        <EmptyState
          title="La bibliothèque est vide"
          body="Aucune collection n’est ouverte pour le moment."
        />
      ) : (
        <RayonsDepliables rayons={rayons} />
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
