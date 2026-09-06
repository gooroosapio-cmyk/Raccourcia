'use client';

import { useEffect, useRef, useState } from 'react';
import { AccessBadge } from '@/components/cards/access-badge';
import { BeforeAfterMedia, MediaPlaceholder } from '@/components/media/before-after-media';
import { CompatibilityList } from '@/components/detail/compatibility-list';
import { CopyCommandButton } from '@/components/cards/copy-command-button';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { InputExampleList } from '@/components/detail/input-example-list';
import { OutputFormatList } from '@/components/detail/output-format-list';
import { usePaywall } from '@/components/paywall/paywall-provider';
import { useToast } from '@/components/ui/toast';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Fiche d'une commande, en bottom sheet.
 *
 * Le detail reste une couche par-dessus la grille : la fermer rend la
 * position de defilement et les filtres exactement tels qu'ils etaient.
 *
 * Elle repond a quatre questions, dans cet ordre : ce que fait la commande,
 * ce qu'il faut lui fournir, ce qu'on recoit, ou l'utiliser. Le contenu
 * complet de la commande n'est present nulle part : il est demande au clic.
 */
export function PromptDetailSheet({
  prompt,
  provider,
  onProviderChange,
  locked,
  free,
  onClose,
}: {
  prompt: PromptCard;
  provider: string;
  onProviderChange: (provider: string) => void;
  locked: boolean;
  free: boolean;
  onClose: () => void;
}) {
  const { open: ouvrirOffre } = usePaywall();
  const { show } = useToast();
  const fermerRef = useRef<HTMLButtonElement>(null);
  const [agrandi, setAgrandi] = useState(false);

  useEffect(() => {
    fermerRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Une couche a la fois : l'agrandissement se ferme avant la fiche.
      setAgrandi((ouvert) => {
        if (ouvert) return false;
        onClose();
        return false;
      });
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const compatibles = prompt.providers.filter((entry) => entry.compatibility !== 'non_supporte');
  const actif = compatibles.find((entry) => entry.key === provider) ?? compatibles[0];
  const partiel = actif?.compatibility === 'partiel';

  const partager = async () => {
    const url = `${window.location.origin}/r/${prompt.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: prompt.command, text: prompt.resultSummary, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      show('Lien copie');
    } catch {
      // Un partage annule par l'utilisateur n'est pas une erreur a signaler.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fermer la fiche"
        onClick={onClose}
        className="anim-fondu absolute inset-0 bg-[color:var(--color-night)]/45"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fiche-commande"
        className="anim-sheet relative flex max-h-[92dvh] w-full max-w-screen-sm flex-col overflow-y-auto rounded-t-[color:var(--radius-sheet)] bg-[color:var(--color-surface)] shadow-[var(--shadow-sheet)]"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-1 border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-2 py-2">
          <button
            ref={fermerRef}
            type="button"
            onClick={onClose}
            aria-label="Revenir a la liste"
            className="touch-target inline-flex items-center justify-center rounded-full text-[color:var(--color-night)]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 5 8 12l7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="flex items-center">
            <FavoriteButton promptId={prompt.id} initial={prompt.isFavorite} disabled={locked} />
            <button
              type="button"
              onClick={partager}
              aria-label="Partager cette commande"
              className="touch-target inline-flex items-center justify-center rounded-full text-[color:var(--color-muted)]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 15V4m0 0L8 8m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className="px-5 pb-4 pt-4">
          {prompt.showImageCard ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => prompt.beforeAfter && setAgrandi(true)}
                aria-label={
                  prompt.beforeAfter
                    ? 'Agrandir la comparaison avant et apres'
                    : 'Aucun visuel disponible'
                }
                disabled={!prompt.beforeAfter}
                className="block w-full"
              >
                <div
                  className={
                    locked
                      ? 'scale-[1.04] overflow-hidden rounded-[color:var(--radius-card)] blur-[8px]'
                      : undefined
                  }
                >
                  {prompt.beforeAfter ? (
                    <BeforeAfterMedia media={prompt.beforeAfter} command={prompt.command} />
                  ) : (
                    <MediaPlaceholder command={prompt.command} />
                  )}
                </div>
              </button>
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-2">
            <h2
              id="fiche-commande"
              className="commande truncate text-[22px] font-semibold text-[color:var(--color-brand)]"
            >
              {prompt.command}
            </h2>
            <AccessBadge free={free} locked={locked} isNew={prompt.isNew} />
          </div>

          <p className="mt-1.5 text-[16px] leading-relaxed text-[color:var(--color-night)]">
            {prompt.resultSummary}
          </p>

          {prompt.useCases.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {prompt.useCases.slice(0, 3).map((cas) => (
                <li
                  key={cas}
                  className="flex gap-2 text-[14px] leading-relaxed text-[color:var(--color-muted)]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color:var(--color-brand)]"
                  />
                  <span>{cas}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {prompt.inputExamples.length > 0 ? (
            <Section titre="Exemples d entrees">
              <InputExampleList inputs={prompt.inputExamples} />
              {prompt.expectedInput ? (
                <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
                  {prompt.expectedInput}
                </p>
              ) : null}
            </Section>
          ) : null}

          {prompt.outputFormats.length > 0 ? (
            <Section titre="Resultat">
              <OutputFormatList formats={prompt.outputFormats} />
            </Section>
          ) : null}

          {compatibles.length > 0 ? (
            <Section titre="Compatible avec">
              <CompatibilityList
                providers={compatibles}
                selected={actif?.key}
                onSelect={onProviderChange}
              />
              {partiel ? (
                <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--color-warning)]">
                  La commande fonctionne, mais la generation de l image depend de l interface de
                  cette IA.
                </p>
              ) : null}
            </Section>
          ) : null}

          {prompt.riskLevel === 'eleve' && prompt.limitations ? (
            <p className="mt-4 rounded-[color:var(--radius-control)] bg-[color:var(--color-member-soft)] px-3 py-2.5 text-[13px] leading-relaxed text-[color:var(--color-member)]">
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

        <div className="sticky bottom-0 border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <CopyCommandButton
            promptId={prompt.id}
            provider={actif?.key ?? 'chatgpt'}
            surface="detail"
            locked={locked}
            onLockedClick={ouvrirOffre}
          />
        </div>
      </div>

      {agrandi && prompt.beforeAfter && !locked ? (
        <button
          type="button"
          onClick={() => setAgrandi(false)}
          aria-label="Fermer l agrandissement"
          className="anim-fondu fixed inset-0 z-[70] flex items-center justify-center bg-[color:var(--color-night)]/90 p-4"
        >
          <div className="w-full max-w-3xl">
            <BeforeAfterMedia
              media={prompt.beforeAfter}
              command={prompt.command}
              sizes="100vw"
              priority
            />
          </div>
        </button>
      ) : null}
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
        {titre}
      </h3>
      {children}
    </section>
  );
}
