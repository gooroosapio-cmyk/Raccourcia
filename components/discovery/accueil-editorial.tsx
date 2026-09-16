import { RailExplorer } from '@/components/discovery/rail-explorer';
import { CarteEditoriale } from '@/components/feed/carte-editoriale';
import { FeedDecouverte, type Intercalaire } from '@/components/feed/feed-decouverte';
import { ListeCompacte } from '@/components/cards/liste-compacte';
import { collectionsAProposer } from '@/lib/catalog/suggestions';
import type { LibraryFamily, PromptCard } from '@/lib/catalog/types';

/**
 * L'Accueil quand rien n'est encore cherche.
 *
 * Une seule chose y descend : la galerie. Tout ce qui l'entourait — la grille
 * de rayons chiffres, les blocs « Modes IA » et « Parcours guides », la
 * rangee « Reprendre » — occupait le premier ecran entier, si bien qu'on
 * arrivait devant un aiguillage et non devant des idees.
 *
 * Restent trois etages : par ou entrer, ce qu'on a laisse en route, et de
 * quoi decouvrir sans savoir quoi chercher. Les deux premiers tiennent en
 * quelques dizaines de pixels ; le troisieme est la page.
 *
 * « Reprendre » revient avant la galerie et non plus au milieu : une reprise
 * qu'on rencontre a la quatrieme carte n'est plus une reprise, c'est une
 * interruption. Une seule entree — au-dela c'est un historique, et il a sa
 * page.
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

  // Deux invitations au plus, posees loin l'une de l'autre : apres quatre
  // rangees, puis apres dix. Interrompre plus souvent une galerie qu'on
  // parcourt au pouce revient a la decouper en blocs.
  const suggestions = collectionsAProposer(familles);
  const intercalaires: Intercalaire[] = suggestions.map((collection, index) => ({
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
          />
        </section>
      ) : (
        // Une galerie vide — aucune commande visuelle publiee — ne doit pas
        // emporter avec elle les invitations : elles se posent alors les unes
        // sous les autres, a la place des idees.
        <div className="flex flex-col gap-3">
          {intercalaires.map((element) => (
            <div key={element.cle}>{element.noeud}</div>
          ))}
        </div>
      )}
    </div>
  );
}
