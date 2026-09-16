'use client';

import { Fragment, useCallback, useState, type ReactNode } from 'react';
import { CarteFeed } from '@/components/feed/carte-feed';
import { PromptDetailSheet } from '@/components/detail/prompt-detail';
import { openPaywall } from '@/components/paywall/paywall-provider';
import { trackPromptView } from '@/lib/actions/catalog';
import { usePreferredProvider } from '@/lib/catalog/use-preferred-provider';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Le feed de decouverte, et la fiche qu'il ouvre.
 *
 * Meme mecanique que la grille : l'etat de la fiche vit ici, donc l'ouvrir
 * puis la fermer ne retouche jamais le feed — le defilement reste ou il
 * etait, ce qui compte d'autant plus dans une liste qu'on parcourt longtemps.
 *
 * Le feed s'allonge par paliers plutot que d'arriver entier. Soixante cartes
 * pleine largeur, ce sont soixante images : les charger d'un coup sur un
 * reseau lent revient a ne rien afficher pendant plusieurs secondes.
 */
const PALIER = 8;

/**
 * Ce qui s'intercale entre deux cartes : une reprise, une invitation a
 * ouvrir un mode IA. `apres` compte les cartes reellement affichees, donc un
 * intercalaire pose trop loin attend le palier suivant plutot que de remonter.
 */
export type Intercalaire = { cle: string; apres: number; noeud: ReactNode };

export function FeedDecouverte({
  prompts,
  locked,
  visiteur = false,
  initialProvider = 'chatgpt',
  intercalaires = [],
}: {
  prompts: PromptCard[];
  locked: boolean;
  visiteur?: boolean;
  initialProvider?: string;
  intercalaires?: Intercalaire[];
}) {
  const [selection, setSelection] = useState<PromptCard | null>(null);
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

  const visibles = prompts.slice(0, montrees);

  return (
    <>
      <div className="flex flex-col gap-3">
        {visibles.map((prompt, index) => {
          const verrouille = locked && !prompt.isFree;
          const apres = intercalaires.filter((element) => element.apres === index + 1);
          return (
            <Fragment key={prompt.id}>
              <CarteFeed
                prompt={prompt}
                locked={verrouille}
                free={locked && prompt.isFree}
                visiteur={visiteur}
                // Seule la premiere carte est prioritaire : c'est la seule
                // certaine d'etre a l'ecran au chargement.
                priority={index === 0}
                onOpen={ouvrir}
              />
              {apres.map((element) => (
                <div key={element.cle}>{element.noeud}</div>
              ))}
            </Fragment>
          );
        })}
      </div>

      {montrees < prompts.length ? (
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
