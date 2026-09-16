import { RailExplorer } from '@/components/discovery/rail-explorer';
import { CarteEditoriale } from '@/components/feed/carte-editoriale';
import { FeedDecouverte, type Intercalaire } from '@/components/feed/feed-decouverte';
import { PromptGrid } from '@/components/cards/prompt-grid';
import { ListeCompacte } from '@/components/cards/liste-compacte';
import { collectionsAProposer } from '@/lib/catalog/suggestions';
import type { LibraryFamily, PromptCard } from '@/lib/catalog/types';

/**
 * Combien d'idees passent dans le carrousel de tete.
 *
 * Huit : de quoi faire trois ou quatre gestes avant d'arriver au bout. Une
 * rangee qu'on epuise en deux poussees n'invite pas a la parcourir.
 */
const CARROUSEL = 8;

/**
 * L'Accueil quand rien n'est encore cherche.
 *
 * Quatre etages, dans l'ordre ou l'on s'en sert : par ou entrer, ce qu'on a
 * laisse en route, une poignee d'idees qui defilent, puis la galerie.
 *
 * Le carrousel et la galerie ne font pas double emploi. Le premier se
 * parcourt d'un pouce, horizontalement, sans quitter le haut de l'ecran :
 * c'est une vitrine. La seconde se descend et ne s'arrete pas : c'est le
 * rayon. Les deux ne montrent jamais les memes cartes — la galerie reprend
 * exactement la ou le carrousel s'arrete.
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
  const derniere = reprendre[0];

  const carrousel = feed.slice(0, CARROUSEL);
  const galerie = feed.slice(CARROUSEL);

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

      {derniere ? (
        <section className="space-y-1.5">
          <h2 className="text-[length:var(--texte-carte)] font-semibold text-[color:var(--color-muted)]">
            Reprendre
          </h2>
          <ListeCompacte prompts={[derniere]} locked={locked} visiteur={visiteur} />
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
            // Le carrousel a deja pris la priorite de chargement : deux
            // rangees d'images prioritaires en demanderaient dix a la fois et
            // le navigateur n'accelererait plus rien.
            intercalaires={intercalaires}
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
