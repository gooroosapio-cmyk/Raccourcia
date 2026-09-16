import { RailExplorer } from '@/components/discovery/rail-explorer';
import { CarteEditoriale } from '@/components/feed/carte-editoriale';
import { FeedDecouverte, type Intercalaire } from '@/components/feed/feed-decouverte';
import { PromptGrid } from '@/components/cards/prompt-grid';
import { collectionsAProposer } from '@/lib/catalog/suggestions';
import { traitsDesRayons } from '@/lib/catalog/rayons';
import type { LibraryFamily, PromptCard } from '@/lib/catalog/types';

/**
 * L'Accueil quand rien n'est encore cherche.
 *
 * Trois etages, dans l'ordre ou l'on s'en sert : par ou entrer, ce qu'on a
 * copie en dernier, puis la galerie.
 *
 * Il y en avait quatre. Un carrousel « A decouvrir » de vingt cartes
 * s'intercalait avant la galerie, qui retirait ensuite ces vingt-la. Les deux
 * montraient les memes cartes sous deux formes, a deux ecrans d'intervalle :
 * on parcourait la premiere sans savoir qu'on parcourrait la seconde, et le
 * catalogue paraissait plus court qu'il n'est. La selection occupe desormais
 * la tete de la galerie — c'est la meme chose, en un seul geste.
 */
export function AccueilEditorial({
  feed,
  reprendre,
  familles,
  locked,
  visiteur,
}: {
  feed: PromptCard[];
  reprendre: PromptCard[];
  familles: LibraryFamily[];
  locked: boolean;
  visiteur: boolean;
}) {
  // Une carte connait sa collection, jamais sa famille. L'Accueil charge deja
  // la bibliotheque entiere : il resout le trait de chaque rayon une fois et
  // le passe aux galeries, plutot qu'une jointure a deux etages par lecture —
  // et plutot que de faire entrer les soixante-douze traits du kit dans le
  // navigateur pour en dessiner six.
  const rayons = traitsDesRayons(familles);

  // Deux invitations au plus, posees loin l'une de l'autre. Interrompre plus
  // souvent une galerie qu'on parcourt au pouce revient a la decouper en
  // blocs.
  const intercalaires: Intercalaire[] = collectionsAProposer(familles).map((collection, index) => ({
    cle: collection.slug,
    apres: index === 0 ? 8 : 20,
    noeud: (
      <CarteEditoriale
        surtitre={collection.famille}
        titre={collection.name}
        action="Voir la collection"
        href={`/app/bibliotheque/${collection.slug}`}
        apercus={collection.apercus}
      />
    ),
  }));

  return (
    <div className="space-y-5 pt-1">
      <RailExplorer familles={familles} />

      {reprendre.length > 0 ? (
        <section className="space-y-1.5">
          {/* « Copiees recemment », et non « Reprendre ».
              Rien n'est repris : l'application ne sait pas ou en est la
              conversation qu'on a menee ailleurs, et un titre qui le laisse
              croire promet une continuite qui n'existe pas. Ce qu'elle sait,
              c'est ce qu'on a copie — et c'est deja ce qu'on revient chercher. */}
          <h2 className="text-[length:var(--texte-carte)] font-semibold text-[color:var(--color-muted)]">
            Copiées récemment
          </h2>
          {/* Les trois dernieres commandes copiees, et non ouvertes : on ouvre
              dix fiches pour en retenir une, mais on ne copie que ce dont on
              s'est servi. En carrousel — trois cartes en colonne pousseraient
              la galerie hors de l'ecran. */}
          <PromptGrid
            prompts={reprendre}
            locked={locked}
            visiteur={visiteur}
            disposition="rangee"
            prioritaire={false}
            rayons={rayons}
            emptyState={null}
          />
        </section>
      ) : null}

      {feed.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[length:var(--texte-section)] font-bold leading-tight text-[color:var(--color-night)]">
            À vous de créer
          </h2>
          <FeedDecouverte
            prompts={feed}
            locked={locked}
            visiteur={visiteur}
            intercalaires={intercalaires}
            rayons={rayons}
            filtrable
          />
        </section>
      ) : (
        // Une galerie vide ne doit pas emporter avec elle les invitations :
        // elles se posent alors les unes sous les autres, a la place des idees.
        <div className="flex flex-col gap-3">
          {intercalaires.map((element) => (
            <div key={element.cle}>{element.noeud}</div>
          ))}
        </div>
      )}
    </div>
  );
}
