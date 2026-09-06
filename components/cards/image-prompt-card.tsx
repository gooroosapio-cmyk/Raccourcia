'use client';

import { BeforeAfterMedia, MediaPlaceholder } from '@/components/media/before-after-media';
import { AccessBadge } from '@/components/cards/access-badge';
import { CompatibilityList } from '@/components/detail/compatibility-list';
import { CopyCommandButton } from '@/components/cards/copy-command-button';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { usePaywall } from '@/components/paywall/paywall-provider';
import type { PromptCard as PromptCardData } from '@/lib/catalog/types';

/**
 * Carte d'une commande image.
 *
 * Une colonne sur mobile : deux cartes cote a cote tronquaient la commande et
 * la promesse, or ce sont les deux seules choses qui font choisir.
 *
 * Le visuel verrouille est floute. C'est un signal commercial, pas une
 * protection : le contenu premium n'atteint jamais le client, il ne sort que
 * par resolve_prompt apres ses six controles.
 */
export function ImagePromptCard({
  prompt,
  provider,
  locked,
  free,
  priority,
  onOpen,
}: {
  prompt: PromptCardData;
  provider: string;
  locked: boolean;
  free: boolean;
  priority: boolean;
  onOpen: (prompt: PromptCardData) => void;
}) {
  const { open: ouvrirOffre } = usePaywall();
  const compatibles = prompt.providers.filter((entry) => entry.compatibility !== 'non_supporte');
  const actif = compatibles.find((entry) => entry.key === provider) ?? compatibles[0];

  return (
    <article className="anim-apparition overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => onOpen(prompt)}
        aria-label={`Ouvrir la fiche de ${prompt.command}`}
        className="block w-full text-left"
      >
        <div className="relative">
          {/* L'agrandissement evite les bords transparents que laisse le flou. */}
          <div className={locked ? 'scale-[1.06] blur-[8px]' : undefined}>
            {prompt.beforeAfter ? (
              <BeforeAfterMedia
                media={prompt.beforeAfter}
                command={prompt.command}
                priority={priority}
                sizes="(max-width: 640px) 100vw, 600px"
                rounded={false}
              />
            ) : (
              <MediaPlaceholder command={prompt.command} />
            )}
          </div>
          {locked ? (
            <span aria-hidden="true" className="absolute inset-0 bg-[color:var(--color-night)]/5" />
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5 px-4 pb-3 pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="commande truncate text-[19px] font-semibold text-[color:var(--color-brand)]">
              {prompt.command}
            </span>
            <AccessBadge free={free} locked={locked} isNew={prompt.isNew} />
          </div>

          <p className="line-clamp-2 text-[15px] leading-snug text-[color:var(--color-night)]">
            {prompt.resultSummary}
          </p>

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
