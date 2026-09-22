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
    // L'acces d'abord : c'est lui qui decide de ce que le feed contient.
    // Un visiteur sans acces a vie ne voit que les commandes offertes —
    // parcourir deux cent trente-quatre resultats dont il ne peut rien
    // copier ne lui apprend rien et ne vend rien.
    acces = await getAccessState();
    const offertesSeulement = !acces.hasFullAccess;

    [page, disponibles] = await Promise.all([
      getDecouverte(null, { offertesSeulement }),
      compterLesVisuels(offertesSeulement),
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
        {disponibles === 0 && acces.hasFullAccess ? (
          <EmptyState
            title="Rien à découvrir pour l’instant"
            body="Cette page ne montre que des résultats en images, et aucune commande n’en porte encore. La Bibliothèque, elle, reste ouverte."
          />
        ) : disponibles === 0 ? (
          /* Un visiteur devant zéro carte ne regarde pas un catalogue vide :
             il regarde un catalogue dont aucune commande offerte n'a encore
             de visuel. Lui dire « rien à découvrir » lui ferait croire que
             le produit est vide, au moment précis où l'on voudrait qu'il
             ouvre l'offre. */
          <EmptyState
            title="Aucun aperçu offert pour l’instant"
            body="Cette page montre les résultats des commandes offertes. L’accès à vie ouvre tout le catalogue en images."
            actionLabel="Voir l’offre"
            actionHref="/offre"
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
