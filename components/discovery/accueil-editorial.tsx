import { AccesRapides } from '@/components/discovery/acces-rapides';
import { FeedDecouverte } from '@/components/feed/feed-decouverte';
import { PromptGrid } from '@/components/cards/prompt-grid';
import type { LibraryFamily, PromptCard } from '@/lib/catalog/types';

/**
 * L'Accueil quand rien n'est encore cherche.
 *
 * Trois etages, dans l'ordre ou l'on s'en sert : par ou entrer, ce qu'on a
 * laisse en route, et de quoi decouvrir sans savoir quoi chercher.
 *
 * Le feed est le corps de la page et non une rangee de plus. Les rangees
 * horizontales presentent trois cartes et cachent le reste derriere un
 * geste ; le feed, lui, se parcourt. C'est la difference entre un rayon de
 * magasin et une vitrine.
 *
 * « Reprendre » n'existe pas pour qui vient d'arriver, et ne montre jamais
 * plus de trois entrees : au-dela, ce n'est plus une reprise, c'est un
 * historique — il a sa page.
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
  return (
    <div className="space-y-6 pt-1">
      <AccesRapides familles={familles} />

      {reprendre.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[length:var(--texte-section)] font-bold leading-tight text-[color:var(--color-night)]">
            Reprendre
          </h2>
          <PromptGrid
            prompts={reprendre}
            locked={locked}
            visiteur={visiteur}
            prioritaire={false}
            disposition="rangee"
            emptyState={null}
          />
        </section>
      ) : null}

      {feed.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[length:var(--texte-section)] font-bold leading-tight text-[color:var(--color-night)]">
            À découvrir
          </h2>
          <FeedDecouverte prompts={feed} locked={locked} visiteur={visiteur} />
        </section>
      ) : null}
    </div>
  );
}
