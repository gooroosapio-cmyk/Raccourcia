import { getBibliotheque } from '@/lib/catalog/queries';
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
 * La Bibliotheque : les deux facons de se servir de l'outil, puis les rayons.
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

  try {
    familles = await getBibliotheque();
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
