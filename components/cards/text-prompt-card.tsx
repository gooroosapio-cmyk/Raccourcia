'use client';

import { AccessBadge } from '@/components/cards/access-badge';
import { CompatibilityList } from '@/components/detail/compatibility-list';
import { CopyCommandButton } from '@/components/cards/copy-command-button';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { OutputFormatList } from '@/components/detail/output-format-list';
import { usePaywall } from '@/components/paywall/paywall-provider';
import type { PromptCard as PromptCardData } from '@/lib/catalog/types';

/**
 * Carte d'une commande texte.
 *
 * Aucune fausse comparaison photographique : une commande texte ne produit
 * pas d'image, lui en inventer une tromperait sur le resultat. La carte
 * montre ce qu'elle a de vrai : la commande, ce qu'elle produit, un cas
 * d'usage court et le format de sortie.
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
    <article className="anim-apparition overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => onOpen(prompt)}
        aria-label={`Ouvrir la fiche de ${prompt.command}`}
        className="block w-full px-4 pb-3 pt-3.5 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="commande truncate text-[19px] font-semibold text-[color:var(--color-brand)]">
            {prompt.command}
          </span>
          <AccessBadge free={free} locked={locked} isNew={prompt.isNew} />
        </div>

        <p className="mt-1.5 line-clamp-2 text-[15px] leading-snug text-[color:var(--color-night)]">
          {prompt.resultSummary}
        </p>

        {exemple ? (
          <p className="mt-2.5 line-clamp-2 rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)] px-3 py-2 text-[13px] leading-snug text-[color:var(--color-muted)]">
            {exemple}
          </p>
        ) : null}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <OutputFormatList formats={prompt.outputFormats} compact />
          {compatibles.length > 0 ? <CompatibilityList providers={compatibles} compact /> : null}
        </div>
      </button>

      <div className="flex items-center gap-2 border-t border-[color:var(--color-line)] px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <CopyCommandButton
            promptId={prompt.id}
            provider={actif?.key ?? 'chatgpt'}
            surface="carte"
            locked={locked}
            compact
            onLockedClick={ouvrirOffre}
          />
        </div>
        <FavoriteButton promptId={prompt.id} initial={prompt.isFavorite} disabled={locked} />
      </div>
    </article>
  );
}
