'use client';

import { useEffect, useRef } from 'react';
import { UpgradePanel, type Offre } from '@/components/paywall/upgrade-panel';
import { SheetCloseButton } from '@/components/ui/sheet-close';

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
      {/* Le fond referme au toucher, mais il n'est pas annonce : la croix
          porte deja ce nom, et deux commandes homonymes se suivant dans la
          lecture vocale ne disent pas laquelle fait quoi. Le clavier a la
          croix et la touche Echap. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="anim-fondu absolute inset-0 bg-[color:var(--color-night)]/45"
      />

      <div className="anim-sheet relative max-h-[90dvh] w-full max-w-screen-sm overflow-y-auto rounded-t-[color:var(--radius-sheet)] bg-[color:var(--color-surface)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[var(--shadow-sheet)]">
        {/* La poignee dit que le panneau se glisse ; la croix donne la sortie
            a qui ne glisse pas — souris, clavier, lecteur d'ecran. Elle est
            en haut parce que le lien du bas oblige a parcourir toute l'offre
            avant d'etre atteint. */}
        <div className="relative mb-4 flex items-center justify-center">
          <span
            aria-hidden="true"
            className="h-1 w-10 rounded-full bg-[color:var(--color-line-strong)]"
          />
          <span className="absolute right-0 -mr-1">
            <SheetCloseButton ref={fermerRef} onClose={onClose} libelle="Fermer l’offre" />
          </span>
        </div>

        <div id="offre-titre">
          <UpgradePanel offre={offre} compact />
        </div>

        <button
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
