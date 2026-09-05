'use client';

import { useState, useTransition } from 'react';
import { toggleFavorite } from '@/lib/actions/catalog';

/**
 * Coeur de favori. Rendu optimiste avec retour arriere si le serveur refuse
 * (Spec UX/UI, 13.1). Cible tactile de 44 px, meme si l'icone est plus petite.
 */
export function FavoriteButton({
  promptId,
  initial,
  disabled = false,
}: {
  promptId: string;
  initial: boolean;
  disabled?: boolean;
}) {
  const [isFavorite, setIsFavorite] = useState(initial);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    if (disabled) return;
    const next = !isFavorite;
    setIsFavorite(next);

    startTransition(async () => {
      const result = await toggleFavorite(promptId);
      if ('error' in result) setIsFavorite(!next);
      else setIsFavorite(result.isFavorite);
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || pending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className="touch-target inline-flex items-center justify-center rounded-full text-[color:var(--color-muted)] transition-colors duration-[var(--duration-fast)] disabled:opacity-50"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={isFavorite ? 'var(--color-brand)' : 'none'}
        aria-hidden="true"
      >
        <path
          d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 0 1 19.4 13Z"
          stroke={isFavorite ? 'var(--color-brand)' : 'currentColor'}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
