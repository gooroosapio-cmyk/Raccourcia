'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Sortie des ecrans de connexion, d'activation et de recuperation.
 *
 * Ces trois ecrans sont les seuls du site public ou l'on entre pour faire une
 * chose precise, et d'ou l'on peut vouloir repartir sans l'avoir faite. Le
 * logo ramene a l'accueil marketing, qu'on vient justement de quitter : la
 * croix, elle, rend la bibliotheque — les commandes verrouillees, mais
 * visibles, que le visiteur regardait avant qu'on lui demande un compte.
 *
 * Une croix et non un chevron : on ne remonte pas d'un cran dans une
 * hierarchie, on referme un ecran pose par-dessus le catalogue.
 */
const ECRANS = ['/connexion', '/activation', '/recuperation'];

export function AuthCloseLink() {
  const pathname = usePathname();
  if (!ECRANS.includes(pathname)) return null;

  return (
    <Link
      href="/app"
      aria-label="Fermer et revenir aux commandes"
      className="touch-target inline-flex items-center justify-center rounded-full text-[color:var(--color-night)] transition-colors duration-[var(--duration-fast)] active:bg-[color:var(--color-sky)]"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m6 6 12 12M18 6 6 18"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </Link>
  );
}
