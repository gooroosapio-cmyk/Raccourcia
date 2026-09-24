'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { PromptDetailSheet } from '@/components/detail/prompt-detail';
import { openPaywall } from '@/components/paywall/paywall-provider';
import { trackPromptView } from '@/lib/actions/catalog';
import { actionPrincipale } from '@/lib/catalog/experience';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Une liste de commandes en lignes compactes.
 *
 * Les Favoris passaient par la grille a deux colonnes du catalogue : sur un
 * ecran de 360 px, chaque carte faisait 165 px de large et son titre se
 * coupait au deuxieme mot. Or on ne parcourt pas ses favoris, on y retourne —
 * il faut les reconnaitre et les relancer, pas les decouvrir.
 *
 * Une ligne par commande : la vignette a gauche, le titre en entier, le
 * verbe qui convient a droite. Trois fois plus de favoris tiennent a l'ecran,
 * et chacun se lit.
 */
export function ListeCompacte({
  prompts,
  locked,
  visiteur = false,
}: {
  prompts: PromptCard[];
  locked: boolean;
  visiteur?: boolean;
}) {
  const [selection, setSelection] = useState<PromptCard | null>(null);

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

  return (
    <>
      <ul className="flex flex-col gap-2">
        {prompts.map((prompt) => {
          const verrouille = locked && !prompt.isFree;
          return (
            <li
              key={prompt.id}
              className="relative flex items-center gap-3 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-2"
            >
              <button
                type="button"
                onClick={() => ouvrir(prompt)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-[color:var(--radius-control)] bg-[color:var(--color-sky)]">
                  {prompt.thumbnailUrl ? (
                    <Image
                      src={prompt.thumbnailUrl}
                      alt=""
                      fill
                      sizes="56px"
                      className={`object-cover ${verrouille ? 'blur-[4px]' : ''}`}
                    />
                  ) : null}
                </span>

                <span className="flex min-w-0 flex-col gap-0.5">
                  {prompt.collectionName ? (
                    <span className="truncate text-[length:var(--texte-meta)] font-semibold uppercase tracking-wide text-[color:var(--color-brand)]/70">
                      {prompt.collectionName}
                    </span>
                  ) : null}
                  <span className="line-clamp-2 text-[length:var(--texte-corps)] font-semibold leading-tight text-[color:var(--color-night)]">
                    {prompt.name}
                  </span>
                </span>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => ouvrir(prompt)}
                  className="touch-target inline-flex items-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-3 text-[length:var(--texte-carte)] font-semibold text-white"
                >
                  {actionPrincipale(prompt)}
                </button>
                <FavoriteButton
                  promptId={prompt.id}
                  initial={prompt.isFavorite}
                  disabled={locked || visiteur}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {selection ? (
        <PromptDetailSheet
          prompt={selection}
          locked={locked && !selection.isFree}
          free={locked && selection.isFree}
          visiteur={visiteur}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </>
  );
}
