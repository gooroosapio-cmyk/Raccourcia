'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/cards/copy-button';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { usePaywall } from '@/components/paywall/paywall-provider';
import type { PromptCard as PromptCardData } from '@/lib/catalog/types';

/**
 * Carte de raccourci.
 *
 * Deux variantes, conformement a l'arbitrage produit :
 *  - Image : la miniature domine ; a defaut, une vignette typographique
 *    sobre, jamais une image decorative sans sens.
 *  - Texte : aucune carte image imposee. On montre la commande, le benefice
 *    et un cas d'usage court.
 *
 * Le bouton Copier est present directement sur la carte ; le reste de la
 * carte ouvre le detail.
 */
export function PromptCard({
  prompt,
  provider,
  locked,
  free = false,
  onOpen,
}: {
  prompt: PromptCardData;
  provider: string;
  locked: boolean;
  /** Raccourci offert, vu par quelqu'un qui n'a pas encore l'acces a vie. */
  free?: boolean;
  onOpen: (prompt: PromptCardData) => void;
}) {
  const { open: ouvrirOffre } = usePaywall();
  const compatible = prompt.providers.filter((entry) => entry.compatibility !== 'non_supporte');
  const active = compatible.find((entry) => entry.key === provider) ?? compatible[0];
  const firstUseCase = prompt.useCases[0];

  return (
    <article className="flex flex-col overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
      <button
        type="button"
        onClick={() => onOpen(prompt)}
        aria-label={`Ouvrir le detail de ${prompt.command}`}
        className="flex flex-1 flex-col text-left"
      >
        {prompt.showImageCard ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-[color:var(--color-canvas)]">
            {/*
              Verrouille : le visuel est floute. C'est un signal commercial, pas
              une protection — le payload premium n'atteint jamais le client, il
              ne sort que par resolve_prompt apres ses six controles. Le titre et
              la description restent nets : un raccourci qu'on ne comprend pas
              ne donne pas envie de s'abonner.
              L'agrandissement evite les bords transparents que laisse le flou.
            */}
            <div
              className={
                locked
                  ? 'absolute inset-0 scale-110 blur-[7px] transition-[filter] duration-[var(--duration-fast)]'
                  : 'absolute inset-0'
              }
            >
              {prompt.thumbnailUrl ? (
                <Image
                  src={prompt.thumbnailUrl}
                  alt={prompt.thumbnailAlt ?? ''}
                  fill
                  sizes="(max-width: 430px) 50vw, 200px"
                  loading="lazy"
                  className="object-cover"
                />
              ) : (
                // Repli typographique tant que l'admin n'a pas mis de visuel :
                // la carte reste lisible et n'affiche pas de cadre vide.
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[color:var(--color-sky)] to-[color:var(--color-canvas)] px-2">
                  <span className="truncate font-mono text-sm font-semibold text-[color:var(--color-brand)]">
                    {prompt.command}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex flex-1 flex-col gap-1 p-3">
          <div className="flex items-start justify-between gap-1">
            <span className="truncate font-mono text-[15px] font-semibold text-[color:var(--color-night)]">
              {prompt.command}
            </span>
            {/* Un seul badge : "Gratuit" prime, c'est le seul qui appelle une action. */}
            {free ? <Badge tone="gratuit">Gratuit</Badge> : null}
            {!free && prompt.isNew ? <Badge tone="nouveau">Nouveau</Badge> : null}
            {!free && !prompt.isNew && locked ? <Badge tone="premium">Membre</Badge> : null}
          </div>

          <p className="line-clamp-2 text-[13px] leading-snug text-[color:var(--color-muted)]">
            {prompt.shortDescription}
          </p>

          {!prompt.showImageCard && firstUseCase ? (
            <p className="mt-1 line-clamp-2 rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)] px-2 py-1.5 text-[12px] leading-snug text-[color:var(--color-night)]">
              {firstUseCase}
            </p>
          ) : null}

          {compatible.length > 0 ? (
            <p className="mt-auto pt-1 text-[11px] text-[color:var(--color-muted)]">
              {compatible.map((entry) => entry.name).join(' - ')}
            </p>
          ) : null}
        </div>
      </button>

      <div className="flex items-center gap-1 border-t border-[color:var(--color-line)] p-2">
        <div className="min-w-0 flex-1">
          <CopyButton
            promptId={prompt.id}
            command={prompt.command}
            provider={active?.key ?? 'chatgpt'}
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
