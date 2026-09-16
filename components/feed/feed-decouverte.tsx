'use client';

import { Fragment, useCallback, useState, type ReactNode } from 'react';
import { ImagePromptCard } from '@/components/cards/image-prompt-card';
import { TextPromptCard } from '@/components/cards/text-prompt-card';
import { PromptDetailSheet } from '@/components/detail/prompt-detail';
import { openPaywall } from '@/components/paywall/paywall-provider';
import { trackPromptView } from '@/lib/actions/catalog';
import { usePreferredProvider } from '@/lib/catalog/use-preferred-provider';
import { FiltresDeGalerie } from '@/components/feed/filtres-galerie';
import { appliquerLesFiltres, type FiltresGalerie } from '@/lib/catalog/sujets';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * La galerie de decouverte, et la fiche qu'elle ouvre.
 *
 * Deux colonnes, et la meme carte que partout ailleurs. Le feed montrait une
 * carte pleine largeur par idee : visuel, sur-titre, titre, description sur
 * deux lignes, trois reperes et un bouton — soit un ecran entier pour une
 * seule proposition. On ne decouvrait rien, on faisait defiler.
 *
 * Meme mecanique que la grille : l'etat de la fiche vit ici, donc l'ouvrir
 * puis la fermer ne retouche jamais la galerie — le defilement reste ou il
 * etait, ce qui compte d'autant plus dans une liste qu'on parcourt longtemps.
 *
 * La galerie s'allonge par paliers plutot que d'arriver entiere : soixante
 * vignettes chargees d'un coup sur un reseau mobile reviennent a ne rien
 * afficher pendant plusieurs secondes.
 *
 * Vingt-quatre, soit douze rangees de deux : le bouton arrivait deux fois
 * trop tot. On le rencontrait avant d'avoir eu le temps de regarder, et une
 * galerie qu'on interrompt tous les six gestes n'est plus une galerie.
 */
const PALIER = 24;

/**
 * Ce qui s'intercale entre deux cartes : une reprise, une invitation a ouvrir
 * un rayon. `apres` compte les cartes reellement affichees, donc un
 * intercalaire pose trop loin attend le palier suivant plutot que de remonter.
 */
export type Intercalaire = { cle: string; apres: number; noeud: ReactNode };

export function FeedDecouverte({
  prompts,
  locked,
  visiteur = false,
  initialProvider = 'chatgpt',
  intercalaires = [],
  rayons,
  filtrable = false,
}: {
  prompts: PromptCard[];
  locked: boolean;
  visiteur?: boolean;
  initialProvider?: string;
  intercalaires?: Intercalaire[];
  /** A quel rayon appartient chaque collection, par position. */
  rayons?: Record<string, number>;
  /**
   * Propose de restreindre la galerie : format, sujet, acces.
   *
   * Des menus deroulants et non des puces : chaque groupe ferait trois ou
   * quatre pastilles en travers de l'ecran, au-dessus d'une galerie qui a
   * besoin de sa hauteur. Le menu natif ouvre la liste du systeme, que le
   * pouce connait deja.
   */
  filtrable?: boolean;
}) {
  const [selection, setSelection] = useState<PromptCard | null>(null);
  const [filtres, setFiltres] = useState<FiltresGalerie>({});
  const [montrees, setMontrees] = useState(PALIER);
  const [provider, changeProvider] = usePreferredProvider(initialProvider);

  const ouvrir = useCallback(
    (prompt: PromptCard) => {
      if (visiteur && locked && !prompt.isFree) {
        openPaywall();
        return;
      }
      setSelection(prompt);
      if (!visiteur) void trackPromptView(prompt.id);
    },
    [locked, visiteur],
  );

  if (prompts.length === 0) return null;

  const retenues = appliquerLesFiltres(prompts, filtres);
  const visibles = retenues.slice(0, montrees);

  return (
    <>
      {filtrable ? (
        <FiltresDeGalerie
          valeurs={filtres}
          onChange={(valeurs) => {
            setFiltres(valeurs);
            // Le palier revient au debut : rester au quatrieme palier d'une
            // liste qui n'est plus la meme laisse devant des cartes qu'on n'a
            // pas fait defiler.
            setMontrees(PALIER);
          }}
        />
      ) : null}

      {retenues.length === 0 ? (
        <p className="py-6 text-center text-[length:var(--texte-carte)] text-[color:var(--color-muted)]">
          Aucun résultat. Essayez un autre mot ou retirez un filtre.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 min-[400px]:gap-[var(--gouttiere-carte)]">
        {visibles.map((prompt, index) => {
          const verrouille = locked && !prompt.isFree;
          const apres = intercalaires.filter((element) => element.apres === index + 1);
          const commun = {
            prompt,
            provider,
            locked: verrouille,
            free: locked && prompt.isFree,
            masque: visiteur && verrouille,
            visiteur,
            rayon: prompt.collectionSlug ? rayons?.[prompt.collectionSlug] : undefined,
            onOpen: ouvrir,
          };

          // Un mode et un parcours demandent plus d'explication qu'une image :
          // leur promesse se lit, elle ne se devine pas. Ils prennent la
          // rangee entiere plutot que de voir leur apercu coupe au troisieme
          // mot sur une demi-largeur.
          const explique = prompt.entityType === 'mode_ia' || prompt.entityType === 'parcours';

          return (
            <Fragment key={prompt.id}>
              {prompt.showImageCard ? (
                <ImagePromptCard
                  {...commun}
                  // Les quatre premieres vignettes seulement : sur deux
                  // colonnes, un telephone en montre deux rangees avant le
                  // premier defilement.
                  priority={index < 4}
                />
              ) : (
                <div className={explique ? 'min-[360px]:col-span-2' : ''}>
                  <TextPromptCard {...commun} pleineLargeur={explique} />
                </div>
              )}

              {/* Un intercalaire traverse les deux colonnes : pose dans une
                  seule, il decalerait toute la suite de la galerie d'un cran
                  et casserait l'alternance des rayons. */}
              {apres.map((element) => (
                <div key={element.cle} className="col-span-2">
                  {element.noeud}
                </div>
              ))}
            </Fragment>
          );
        })}
      </div>

      {montrees < retenues.length ? (
        <button
          type="button"
          onClick={() => setMontrees((n) => n + PALIER)}
          className="touch-target mt-3 flex w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[15px] font-medium text-[color:var(--color-night)]"
        >
          Voir plus d’idées
        </button>
      ) : null}

      {selection ? (
        <PromptDetailSheet
          prompt={selection}
          provider={provider}
          onProviderChange={changeProvider}
          locked={locked && !selection.isFree}
          free={locked && selection.isFree}
          visiteur={visiteur}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </>
  );
}
