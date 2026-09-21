import { getAccessState } from '@/lib/access/entitlement';
import { compterLesVisuels, getDecouverte } from '@/lib/catalog/decouverte';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
import { FeedImmersif } from '@/components/decouvrir/feed-immersif';
import { PremiereVisite } from '@/components/decouvrir/premiere-visite';
import { NetworkError } from '@/components/ui/network-error';
import { EmptyState } from '@/components/ui/states';

export const metadata = { title: 'Découvrir' };

/**
 * Decouvrir : ce que les commandes produisent, en plein ecran.
 *
 * La page ne fabrique rien. Elle montre les visuels « apres » deja deposes en
 * administration, et seulement eux : il n'existe pas de seconde banque
 * d'images, et une vitrine ou l'on defilerait entre des cadres vides ne
 * donnerait envie de rien.
 *
 * Le premier palier est rendu au serveur. Un feed plein ecran qui arriverait
 * vide puis se remplirait apres coup montrerait un ecran noir le temps du
 * premier aller-retour — soit exactement l'inverse de ce qu'il promet.
 */
export default async function DecouvrirPage() {
  let acces: Awaited<ReturnType<typeof getAccessState>>;
  let page: Awaited<ReturnType<typeof getDecouverte>>;
  let disponibles: number;

  try {
    [acces, page, disponibles] = await Promise.all([
      getAccessState(),
      getDecouverte(),
      compterLesVisuels(),
    ]);
  } catch (error) {
    // Un catalogue injoignable n'est pas un catalogue vide.
    if (isCatalogUnavailable(error)) {
      return (
        <div className="pt-6">
          <NetworkError />
        </div>
      );
    }
    throw error;
  }

  if (page.cartes.length === 0) {
    // Deux silences differents, deux phrases differentes. « Rien a montrer »
    // laisserait croire que le catalogue est vide alors qu'il compte des
    // centaines de commandes dont aucune n'a encore de visuel — et c'est une
    // information qui appelle une action en administration, pas une panne.
    return (
      <div className="pt-6">
        <h1 className="sr-only">Découvrir</h1>
        {disponibles === 0 ? (
          <EmptyState
            title="Rien à découvrir pour l’instant"
            body="Cette page ne montre que des résultats en images, et aucune commande n’en porte encore. La Bibliothèque, elle, reste ouverte."
          />
        ) : (
          <EmptyState
            title="Rien à afficher pour l’instant"
            body="Les visuels du catalogue ne sont pas accessibles pour le moment. Réessayez dans un instant."
          />
        )}
      </div>
    );
  }

  return (
    // La page sort des marges de la coquille : un feed plein ecran borde de
    // vingt pixels de chaque cote n'est plus plein ecran. La marge basse de
    // la coquille — celle qui degage la barre de navigation — est reprise de
    // la meme facon, la zone de defilement calculant sa propre hauteur.
    //
    // La marge vient de `--marge-coquille` et non d'une valeur recopiee :
    // elle vaut 16 px sous 360 px et 20 px au-dela. Une valeur ecrite en
    // dur ici depassait de quatre pixels sur un petit ecran, et quatre
    // pixels de trop suffisent a faire glisser toute la page.
    // Plus de `data-plein-ecran` : l'en-tete ne se teintait pas d'apres cet
    // attribut, il disparait desormais d'apres le chemin. Un marqueur que
    // plus personne ne lit finit par etre recopie ailleurs « au cas ou ».
    <div className="-mb-24 mx-[calc(var(--marge-coquille)*-1)]">
      <h1 className="sr-only">Découvrir</h1>
      <PremiereVisite />
      <FeedImmersif
        initiales={page.cartes}
        suite={page.suite}
        locked={!acces.hasFullAccess}
        visiteur={!acces.isMember}
      />
    </div>
  );
}
