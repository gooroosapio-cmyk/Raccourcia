import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import type { AdminPromptDetail } from '@/lib/admin/queries';

/**
 * Apercu mobile avant publication.
 *
 * La spec l'exige : l'administrateur doit voir l'impact visuel de ses champs
 * avant de publier. C'est une reproduction fidele de la carte membre, sans
 * interaction, donc sans risque de copier un contenu non publie.
 */
export function PromptPreview({ prompt }: { prompt: AdminPromptDetail }) {
  const thumbnail = prompt.media.find((item) => item.kind === 'thumbnail' || item.kind === 'after');
  const publishedProviders = prompt.variants.filter(
    (variant) => variant.variantStatus === 'published',
  );

  return (
    <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] p-4">
      <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
        Apercu de la carte
      </h2>

      <div className="mt-3 w-[calc(50%-6px)] min-w-[160px] overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        {prompt.showImageCard ? (
          <div className="relative aspect-[4/3] w-full bg-[color:var(--color-canvas)]">
            {thumbnail ? (
              <Image
                src={thumbnail.url}
                alt={thumbnail.alt ?? ''}
                fill
                sizes="200px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[color:var(--color-sky)] to-[color:var(--color-canvas)] px-2">
                <span className="truncate font-mono text-sm font-semibold text-[color:var(--color-brand)]">
                  {prompt.command}
                </span>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex flex-col gap-1 p-3">
          <div className="flex items-start justify-between gap-1">
            <span className="truncate font-mono text-[15px] font-semibold text-[color:var(--color-night)]">
              {prompt.command}
            </span>
            {prompt.isNew ? <Badge tone="nouveau">Nouveau</Badge> : null}
          </div>
          <p className="line-clamp-2 text-[13px] leading-snug text-[color:var(--color-muted)]">
            {prompt.shortDescription}
          </p>
          {!prompt.showImageCard && prompt.useCases[0] ? (
            <p className="mt-1 line-clamp-2 rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)] px-2 py-1.5 text-[12px] leading-snug text-[color:var(--color-night)]">
              {prompt.useCases[0]}
            </p>
          ) : null}
          {publishedProviders.length > 0 ? (
            <p className="pt-1 text-[11px] text-[color:var(--color-muted)]">
              {publishedProviders.map((variant) => variant.providerName).join(' - ')}
            </p>
          ) : null}
        </div>
      </div>

      {publishedProviders.length === 0 ? (
        <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--color-warning)]">
          Aucune IA activée : ce raccourci ne peut pas encore être publié.
        </p>
      ) : null}
    </section>
  );
}
