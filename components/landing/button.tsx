import Link from 'next/link';

/**
 * Bouton de la page de vente.
 *
 * Deux niveaux seulement : l'action payante en aplat bleu, tout le reste en
 * contour. Une page qui empile trois niveaux de bouton ne dit plus lequel
 * compte ; ici les deux appels vivent cote a cote et se lisent d'un coup.
 *
 * Toujours un lien, jamais un bouton : chacune de ces actions mene ailleurs —
 * la boutique ou la bibliotheque — et un lien s'ouvre dans un nouvel onglet,
 * se copie, s'annonce comme une destination.
 *
 * Hauteur minimale de 48 px, imposee ici plutot que rappelee a chaque appel.
 */
export function Button({
  href,
  children,
  ton = 'principal',
  taille = 'normale',
  externe = false,
  pleineLargeur = false,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  ton?: 'principal' | 'contour' | 'sombre';
  taille?: 'normale' | 'compacte';
  /** Vrai pour une destination hors du site : la boutique. */
  externe?: boolean;
  pleineLargeur?: boolean;
  className?: string;
}) {
  const tons = {
    principal:
      'bg-[color:var(--color-brand)] text-white shadow-[0_2px_10px_rgb(20_99_255_/_0.22)] hover:bg-[color:var(--color-brand-strong)]',
    contour:
      'border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] text-[color:var(--color-night)] hover:border-[color:var(--color-brand)] hover:text-[color:var(--color-brand)]',
    sombre: 'bg-[color:var(--color-night)] text-white hover:bg-[color:var(--color-night)]/90',
  };

  const tailles = {
    normale: 'h-[52px] px-6 text-[16px]',
    compacte: 'h-12 px-4 text-[14px]',
  };

  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-[14px] font-semibold',
    'transition-[background-color,border-color,color,transform] duration-[var(--duration-fast)]',
    'active:scale-[0.985]',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-brand)]',
    tons[ton],
    tailles[taille],
    pleineLargeur ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (externe) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

/** Fleche des appels a l'action. Decorative : le libelle porte le sens. */
export function FlecheIcone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h13m0 0-5-5m5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
