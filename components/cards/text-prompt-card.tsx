'use client';

import { AILogo } from '@/components/brand/ai-logos';
import { AccessBadge } from '@/components/cards/access-badge';
import { CopyCommandButton } from '@/components/cards/copy-command-button';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { usePaywall } from '@/components/paywall/paywall-provider';
import type { PromptCard as PromptCardData } from '@/lib/catalog/types';

/**
 * Carte d'une commande texte, au meme gabarit que la carte image.
 *
 * Les deux familles cohabitent dans une seule grille : une carte plus courte
 * pour le texte creerait des trous en quinconce a chaque changement de mode.
 * La zone haute est donc typographique — un extrait du resultat attendu, pose
 * sur une trame legere — et jamais une photographie d'illustration, qui
 * promettrait une image que la commande ne produit pas.
 */
export function TextPromptCard({
  prompt,
  provider,
  locked,
  free,
  onOpen,
}: {
  prompt: PromptCardData;
  provider: string;
  locked: boolean;
  free: boolean;
  onOpen: (prompt: PromptCardData) => void;
}) {
  const { open: ouvrirOffre } = usePaywall();
  const compatibles = prompt.providers.filter((entry) => entry.compatibility !== 'non_supporte');
  const actif = compatibles.find((entry) => entry.key === provider) ?? compatibles[0];
  const exemple = prompt.useCases[0];

  return (
    <article className="anim-apparition relative flex flex-col overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => onOpen(prompt)}
        className="flex flex-1 flex-col text-left"
      >
        <span className="relative flex aspect-[4/3] w-full flex-col justify-center gap-1.5 overflow-hidden bg-gradient-to-br from-[color:var(--color-sky)] to-[color:var(--color-canvas)] px-2.5">
          <span aria-hidden="true" className="flex flex-col gap-1">
            <span className="block h-[3px] w-10 rounded-full bg-[color:var(--color-brand)]/35" />
            <span className="block h-[3px] w-full rounded-full bg-[color:var(--color-brand)]/18" />
            <span className="block h-[3px] w-4/5 rounded-full bg-[color:var(--color-brand)]/18" />
            <span className="block h-[3px] w-11/12 rounded-full bg-[color:var(--color-brand)]/18" />
          </span>

          {exemple ? (
            <span className="line-clamp-2 text-[length:var(--texte-meta)] italic leading-[1.35] text-[color:var(--color-muted)]">
              {exemple}
            </span>
          ) : null}
        </span>

        <span className="flex flex-1 flex-col gap-1 px-2.5 pb-2 pt-2">
          <span className="commande truncate text-[length:var(--texte-commande-carte)] font-bold text-[color:var(--color-brand)]">
            {prompt.command}
          </span>

          {/* Ce que fait ce raccourci, pas le format qu'il produit :
              `result_summary` se repete a l'identique sur toute une famille. */}
          <span className="line-clamp-2 text-[length:var(--texte-carte)] leading-[1.35] text-[color:var(--color-night)]">
            {prompt.shortDescription || prompt.resultSummary}
          </span>

          {compatibles.length > 0 ? (
            <span className="mt-auto flex items-center gap-1 pt-1">
              {compatibles.slice(0, 3).map((entry) => (
                <AILogo key={entry.key} providerKey={entry.key} name={entry.name} taille={15} />
              ))}
            </span>
          ) : null}
        </span>
      </button>

      <span className="pointer-events-none absolute left-1.5 top-1.5">
        <AccessBadge free={free} locked={locked} isNew={prompt.isNew} />
      </span>

      <div className="absolute right-0.5 top-0.5">
        <FavoriteButton promptId={prompt.id} initial={prompt.isFavorite} disabled={locked} sur />
      </div>

      <div className="border-t border-[color:var(--color-line)] p-2">
        <CopyCommandButton
          promptId={prompt.id}
          provider={actif?.key ?? 'chatgpt'}
          surface="carte"
          locked={locked}
          compact
          onLockedClick={ouvrirOffre}
        />
      </div>
    </article>
  );
}
