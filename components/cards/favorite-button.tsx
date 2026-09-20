'use client';

import { useState, useTransition } from 'react';
import { toggleFavorite } from '@/lib/actions/catalog';

/**
 * L'etoile de favori. Rendu optimiste, retour arriere si le serveur refuse.
 * Cible tactile de 44 px, meme si l'icone est plus petite.
 *
 * UNE ETOILE, ET PLUS UN COEUR. Les deux gestes existaient cote a cote
 * avec le meme dessin : un coeur pour ranger la commande chez soi, un
 * coeur pour dire publiquement qu'elle sert. Deux sens pour une icone,
 * c'est une icone qui n'en a plus aucun — et sur Decouvrir, ou les deux
 * apparaissaient, personne ne pouvait deviner lequel faisait quoi.
 *
 * L'etoile range, le coeur approuve. C'est aussi la convention des rayons
 * epingles de la Bibliotheque, et il n'y a plus qu'un vocabulaire a
 * apprendre pour toute l'application.
 */
export function FavoriteButton({
  promptId,
  initial,
  disabled = false,
  sur = false,
}: {
  promptId: string;
  initial: boolean;
  disabled?: boolean;
  /**
   * Vrai quand le bouton est pose sur une image : un coeur au trait fin s'y
   * perdrait sur un fond clair comme sur un fond charge. Une pastille
   * translucide le detache sans masquer le visuel.
   */
  sur?: boolean;
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
      <span
        className={
          sur
            ? 'flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-surface)]/85 shadow-[var(--shadow-card)] backdrop-blur-[2px]'
            : 'contents'
        }
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={isFavorite ? 'var(--color-brand)' : 'none'}
          aria-hidden="true"
        >
          <path
            d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z"
            stroke={isFavorite ? 'var(--color-brand)' : 'currentColor'}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
