import { RailExplorer } from '@/components/discovery/rail-explorer';
import { CarteEditoriale } from '@/components/feed/carte-editoriale';
import { FeedDecouverte, type Intercalaire } from '@/components/feed/feed-decouverte';
import { PromptGrid } from '@/components/cards/prompt-grid';
import { collectionsAProposer } from '@/lib/catalog/suggestions';
import { indexDesRayons } from '@/lib/catalog/rayons';
import type { LibraryFamily, PromptCard } from '@/lib/catalog/types';

/**
 * L'Accueil quand rien n'est encore cherche.
 *
 * Quatre etages, dans l'ordre ou l'on s'en sert : par ou entrer, ce qu'on a
 * copie en dernier, une vitrine qui defile, puis la galerie.
 *
 * Le carrousel et la galerie ne font pas double emploi. Le premier se
 * parcourt d'un pouce, horizontalement, sans quitter le haut de l'ecran :
 * c'est une vitrine. La seconde se descend et ne s'arrete pas : c'est le
 * rayon. Les deux ne montrent jamais les memes cartes : la galerie retire ce
 * que la vitrine a pris, plutot que de couper au meme rang — la vitrine
 * puise ailleurs, elle n'est pas le debut de la galerie.
 */
export function AccueilEditorial({
  feed,
  carrousel,
  reprendre,
  familles,
  locked,
  visiteur,
}: {
  feed: PromptCard[];
  /** La vitrine : trois premiers rayons et des modes, deja melangee. */
  carrousel: PromptCard[];
  reprendre: PromptCard[];
  familles: LibraryFamily[];
  locked: boolean;
  visiteur: boolean;
}) {
  // La galerie ne reprend jamais une carte de la vitrine : les voir deux fois
  // a deux ecrans d'intervalle donne l'impression d'un catalogue plus court
  // qu'il n'est.
  const dansLaVitrine = new Set(carrousel.map((carte) => carte.id));
  const galerie = feed.filter((carte) => !dansLaVitrine.has(carte.id));

  // Une carte connait sa collection, jamais sa famille. L'Accueil charge deja
  // la bibliotheque entiere : il construit la correspondance une fois et la
  // passe aux galeries, plutot qu'une jointure a deux etages par lecture.
  const rayons = indexDesRayons(familles);

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
          <h2 className="text-[length:var(--texte-carte)] font-semibold text-[color:var(--color-muted)]">
            Reprendre
          </h2>
          {/* Les trois dernieres commandes copiees, et non ouvertes : on ouvre
              dix fiches pour en retenir une, mais on ne copie que ce dont on
              s'est servi. En carrousel, comme le reste — trois cartes en
              colonne pousseraient la galerie hors de l'ecran. */}
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

      {carrousel.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[length:var(--texte-section)] font-bold leading-tight text-[color:var(--color-night)]">
            À découvrir
          </h2>
          <PromptGrid
            prompts={carrousel}
            locked={locked}
            visiteur={visiteur}
            disposition="rangee"
            rayons={rayons}
            emptyState={null}
          />
        </section>
      ) : null}

      {galerie.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[length:var(--texte-section)] font-bold leading-tight text-[color:var(--color-night)]">
            À vous de créer
          </h2>
          <FeedDecouverte
            prompts={galerie}
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
