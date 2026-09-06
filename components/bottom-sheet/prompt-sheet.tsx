'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/cards/copy-button';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { usePaywall } from '@/components/paywall/paywall-provider';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Detail en bottom sheet plutot qu'en page : l'utilisateur confirme son choix
 * sans quitter la grille, et la fermeture conserve exactement sa position de
 * scroll et ses filtres (Spec UX/UI, 9).
 *
 * Le prompt complet n'est pas dans ce composant : il est demande au clic.
 */
export function PromptSheet({
  prompt,
  provider,
  onProviderChange,
  locked,
  onClose,
}: {
  prompt: PromptCard;
  provider: string;
  onProviderChange: (provider: string) => void;
  locked: boolean;
  onClose: () => void;
}) {
  const { open: ouvrirOffre } = usePaywall();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Le retour arriere ferme d'abord la couche active, puis remonte la
  // navigation (Doc Technique V1, 3.3).
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const compatible = prompt.providers.filter((entry) => entry.compatibility !== 'non_supporte');
  const active = compatible.find((entry) => entry.key === provider) ?? compatible[0];
  const partial = active?.compatibility === 'partiel';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fermer le detail"
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--color-night)]/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-command"
        className="relative flex max-h-[90dvh] w-full max-w-screen-sm flex-col overflow-y-auto rounded-t-[color:var(--radius-sheet)] bg-[color:var(--color-surface)] pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-[color:var(--color-surface)] px-5 pb-2 pt-3">
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-[color:var(--color-line)]"
          />
          <div className="mt-3 flex min-w-0 items-center gap-2">
            <h2
              id="sheet-command"
              className="truncate font-mono text-lg font-semibold text-[color:var(--color-night)]"
            >
              {prompt.command}
            </h2>
            <FavoriteButton promptId={prompt.id} initial={prompt.isFavorite} disabled={locked} />
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="touch-target mt-3 inline-flex items-center justify-center rounded-full text-[color:var(--color-muted)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="px-5">
          {prompt.showImageCard && prompt.thumbnailUrl ? (
            <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-[color:var(--radius-card)] bg-[color:var(--color-canvas)]">
              <Image
                src={prompt.thumbnailUrl}
                alt={prompt.thumbnailAlt ?? ''}
                fill
                sizes="(max-width: 640px) 100vw, 640px"
                className="object-cover"
              />
            </div>
          ) : null}

          <p className="text-base font-medium text-[color:var(--color-night)]">{prompt.name}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-[color:var(--color-muted)]">
            {prompt.shortDescription}
          </p>

          {compatible.length > 0 ? (
            <fieldset className="mt-5">
              <legend className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
                IA compatibles
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {compatible.map((entry) => {
                  const selected = entry.key === active?.key;
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={() => onProviderChange(entry.key)}
                      aria-pressed={selected}
                      className={`touch-target rounded-full px-3 text-sm font-medium transition-colors duration-[var(--duration-fast)] ${
                        selected
                          ? 'bg-[color:var(--color-brand)] text-white'
                          : 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]'
                      }`}
                    >
                      {entry.name}
                    </button>
                  );
                })}
              </div>
              {partial ? (
                <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--color-warning)]">
                  Le prompt fonctionne, mais la generation de l image depend de l interface de cette
                  IA.
                </p>
              ) : null}
            </fieldset>
          ) : null}

          {prompt.useCases.length > 0 ? (
            <section className="mt-5">
              <h3 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
                Quand l utiliser
              </h3>
              <ul className="mt-2 space-y-1.5">
                {prompt.useCases.slice(0, 3).map((useCase) => (
                  <li
                    key={useCase}
                    className="flex gap-2 text-[15px] leading-relaxed text-[color:var(--color-ink)]"
                  >
                    <span aria-hidden="true" className="text-[color:var(--color-brand)]">
                      -
                    </span>
                    <span>{useCase}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {prompt.expectedInput ? (
            <p className="mt-4 rounded-[color:var(--radius-control)] bg-[color:var(--color-sky)] px-3 py-2 text-[13px] leading-relaxed text-[color:var(--color-night)]">
              {prompt.expectedInput}
            </p>
          ) : null}

          {prompt.riskLevel === 'eleve' && prompt.limitations ? (
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-warning)]">
              {prompt.limitations}
            </p>
          ) : null}

          {prompt.requiredVariables.length > 0 ? (
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
              S adapte a votre contexte. Si une information manque, l IA posera une ou deux
              questions courtes.
            </p>
          ) : null}
        </div>

        <div className="sticky bottom-0 mt-5 bg-[color:var(--color-surface)] px-5 pt-3">
          {locked ? <Badge tone="premium">Reserve aux membres</Badge> : null}
          <div className="mt-2">
            <CopyButton
              promptId={prompt.id}
              command={prompt.command}
              provider={active?.key ?? 'chatgpt'}
              surface="detail"
              locked={locked}
              onLockedClick={ouvrirOffre}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
