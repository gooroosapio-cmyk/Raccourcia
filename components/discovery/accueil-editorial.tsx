import { RailExplorer } from '@/components/discovery/rail-explorer';
import { CarteEditoriale } from '@/components/feed/carte-editoriale';
import { FeedDecouverte, type Intercalaire } from '@/components/feed/feed-decouverte';
import { ListeCompacte } from '@/components/cards/liste-compacte';
import {
  FAMILLE_MODES_IA,
  FAMILLE_PARCOURS,
  familleSpeciale,
} from '@/lib/catalog/familles-speciales';
import type { LibraryFamily, PromptCard } from '@/lib/catalog/types';

/**
 * L'Accueil quand rien n'est encore cherche.
 *
 * Une seule chose y descend : le feed. Tout ce qui l'entourait — la grille
 * de categories chiffrees, le bloc « Modes IA », le bloc « Parcours guides »,
 * la rangee « Reprendre » — occupait le premier ecran entier, si bien qu'on
 * arrivait devant un aiguillage et non devant des idees. Il fallait choisir
 * avant d'avoir rien vu.
 *
 * Reste donc : une rangee pour explorer, puis le feed. Ce qui a ete retire
 * n'a pas disparu, il s'est deplace la ou on le rencontre au bon moment —
 * dans le feed, sous forme de cartes, entre deux idees.
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
  const modesIa = familleSpeciale(familles, FAMILLE_MODES_IA);
  const parcours = familleSpeciale(familles, FAMILLE_PARCOURS);

  // La derniere commande ouverte, et elle seule. Au-dela ce n'est plus une
  // reprise mais un historique, et il a sa page.
  const derniere = reprendre[0];

  const intercalaires: Intercalaire[] = [];

  if (derniere) {
    intercalaires.push({
      cle: 'reprendre',
      // Apres les premieres idees et non avant : qui revient reconnait sa
      // commande d'un coup d'oeil, qui decouvre n'a pas a franchir son
      // propre passe pour atteindre le catalogue.
      apres: 2,
      noeud: (
        <section className="space-y-1.5">
          <h3 className="text-[length:var(--texte-carte)] font-semibold text-[color:var(--color-muted)]">
            Reprendre
          </h3>
          <ListeCompacte prompts={[derniere]} locked={locked} visiteur={visiteur} />
        </section>
      ),
    });
  }

  if (modesIa) {
    intercalaires.push({
      cle: 'modes-ia',
      apres: 5,
      noeud: (
        <CarteEditoriale
          surtitre="Mode IA"
          question="Besoin de structurer votre idée ?"
          promesse="Un mode vous pose les bonnes questions avant de répondre."
          action="Activer un Mode IA"
          href={`/app/bibliotheque/famille/${modesIa.slug}`}
        />
      ),
    });
  }

  if (parcours) {
    intercalaires.push({
      cle: 'parcours',
      apres: 8,
      noeud: (
        <CarteEditoriale
          surtitre="Parcours guidé"
          question="Un projet en plusieurs étapes ?"
          promesse="Un parcours enchaîne les livrables, du premier brief à la version finale."
          action="Lancer un parcours"
          href={`/app/bibliotheque/famille/${parcours.slug}`}
        />
      ),
    });
  }

  return (
    <div className="space-y-6 pt-1">
      <RailExplorer familles={familles} />

      {feed.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[length:var(--texte-section)] font-bold leading-tight text-[color:var(--color-night)]">
            À découvrir
          </h2>
          <FeedDecouverte
            prompts={feed}
            locked={locked}
            visiteur={visiteur}
            intercalaires={intercalaires}
          />
        </section>
      ) : (
        // Un feed vide — aucune commande visuelle publiee — ne doit pas
        // emporter avec lui la reprise et les invitations : elles se posent
        // alors les unes sous les autres, a la place des idees.
        <div className="flex flex-col gap-3">
          {intercalaires.map((element) => (
            <div key={element.cle}>{element.noeud}</div>
          ))}
        </div>
      )}
    </div>
  );
}
