import { getBibliotheque } from '@/lib/catalog/queries';
import { RayonsDepliables } from '@/components/library/rayons-depliables';
import { FaconsDUtiliser } from '@/components/library/facons-d-utiliser';
import { NetworkError } from '@/components/ui/network-error';
import { EmptyState } from '@/components/ui/states';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
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
 * Les rayons sont deplies : on vient voir ce qu'il y a, pas ouvrir huit
 * tiroirs. Chacun se replie et se souvient d'avoir ete replie — quarante-
 * trois collections font une page longue, et qui connait son rayon veut
 * pouvoir ranger le reste.
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

  const rayons = famillesDeRayon(familles);
  const modesIa = familleSpeciale(familles, FAMILLE_MODES_IA);
  const parcours = familleSpeciale(familles, FAMILLE_PARCOURS);

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
        <RayonsDepliables familles={rayons} />
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
