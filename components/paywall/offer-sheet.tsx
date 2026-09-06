'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

/**
 * Fenetre d'offre de l'acces a vie.
 *
 * Elle s'ouvre quand un visiteur sans acces bute sur une limite : copie d'un
 * raccourci verrouille, ou tentative d'ouvrir un espace autre que le
 * catalogue. Elle s'ouvre aussi d'elle-meme apres un temps de lecture.
 *
 * Elle reste fermable. Un mur infranchissable ferait fuir avant d'avoir
 * convaincu : la fermeture ramene simplement aux raccourcis offerts, les
 * seuls que le visiteur peut copier.
 */
export function OfferSheet({
  purchaseUrl,
  freeCount,
  totalCount,
  onClose,
}: {
  purchaseUrl: string;
  freeCount: number;
  totalCount: number;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

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

  const avantages = [
    `Les ${totalCount} raccourcis, sans exception`,
    'ChatGPT, Claude et Gemini : une version par IA',
    'Jusqu’a 3 appareils avec le meme compte',
    'Favoris et historique de vos copies',
    'Les nouveaux raccourcis inclus, sans rien repayer',
  ];

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
        className="absolute inset-0 bg-[color:var(--color-night)]/40"
      />

      <div className="relative max-h-[88dvh] w-full max-w-screen-sm overflow-y-auto rounded-t-[color:var(--radius-sheet)] bg-[color:var(--color-surface)] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[color:var(--color-line)]" />

        <h2 id="offre-titre" className="text-[19px] font-semibold text-[color:var(--color-night)]">
          Debloquez tout RaccourcIA
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          Vous pouvez copier {freeCount} raccourcis librement. L&apos;acces a vie ouvre les{' '}
          {totalCount}, en un seul paiement.
        </p>

        <ul className="mt-4 space-y-2">
          {avantages.map((avantage) => (
            <li key={avantage} className="flex items-start gap-2">
              <CheckIcon />
              <span className="text-[14px] leading-snug text-[color:var(--color-night)]">
                {avantage}
              </span>
            </li>
          ))}
        </ul>

        <a
          href={purchaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] text-base font-medium text-white transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--color-brand-strong)]"
        >
          Obtenir l&apos;acces a vie
        </a>

        {/* Deja acheteur : il lui manque seulement d'activer sa licence. */}
        <Link
          href="/activation"
          className="mt-2 flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] text-[15px] font-medium text-[color:var(--color-night)]"
        >
          J&apos;ai deja achete, activer ma licence
        </Link>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="mt-2 flex h-12 w-full items-center justify-center text-[14px] text-[color:var(--color-muted)]"
        >
          Continuer avec les raccourcis offerts
        </button>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 shrink-0"
    >
      <path
        d="M20 6 9 17l-5-5"
        stroke="var(--color-success)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
