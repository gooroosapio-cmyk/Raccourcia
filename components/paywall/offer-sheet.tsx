'use client';

import { useEffect, useRef } from 'react';
import { UpgradePanel, type Offre } from '@/components/paywall/upgrade-panel';

/**
 * Fenetre d'offre de l'acces a vie.
 *
 * Elle s'ouvre quand un visiteur sans acces bute sur une limite : copie d'une
 * commande verrouillee, ou tentative d'ouvrir un espace autre que le
 * catalogue. Elle s'ouvre aussi d'elle-meme apres un temps de lecture.
 *
 * Elle reste fermable. Un mur infranchissable ferait fuir avant d'avoir
 * convaincu : la fermeture ramene simplement aux commandes offertes, les
 * seules que le visiteur peut copier.
 */
export function OfferSheet({ offre, onClose }: { offre: Offre; onClose: () => void }) {
  const fermerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fermerRef.current?.focus();
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offre-titre"
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="anim-fondu absolute inset-0 bg-[color:var(--color-night)]/45"
      />

      <div className="anim-sheet relative max-h-[90dvh] w-full max-w-screen-sm overflow-y-auto rounded-t-[color:var(--radius-sheet)] bg-[color:var(--color-surface)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[var(--shadow-sheet)]">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1 w-10 rounded-full bg-[color:var(--color-line-strong)]"
        />

        <div id="offre-titre">
          <UpgradePanel offre={offre} compact />
        </div>

        <button
          ref={fermerRef}
          type="button"
          onClick={onClose}
          className="mt-1 flex h-12 w-full items-center justify-center text-[14px] text-[color:var(--color-muted)]"
        >
          Continuer avec les commandes offertes
        </button>
      </div>
    </div>
  );
}
