'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/logo';

/**
 * L'en-tete de la coquille : le logo, et ce qui manquait a droite.
 *
 * DEUX RAISONS D'ETRE UN COMPOSANT CLIENT.
 *
 * La premiere : sur Decouvrir, chaque carte occupe l'ecran entier, et
 * l'en-tete ne s'efface plus a moitie — il disparait. On avait d'abord
 * essaye un fond transparent avec un voile sombre par-dessus l'image.
 * C'etait encore un bandeau : il mangeait la premiere bande du visuel,
 * exactement la ou un portrait a son sujet, et il occupait sa hauteur dans
 * le flux — la carte commencait cinquante pixels plus bas que le haut de
 * l'ecran. Plein ecran veut dire l'ecran entier ; la barre basse suffit a
 * sortir de la page.
 *
 * Seule la page sait qu'elle est plein ecran. On avait aussi essaye une
 * regle CSS `body:has([data-plein-ecran])` : elle a l'elegance de ne rien
 * coupler, mais elle depend de la forme exacte de l'arbre rendu, et elle
 * n'a pas pris. Un chemin compare a une constante ne depend de rien.
 *
 * La seconde : l'espace a droite du logo restait vide pour un membre. Un
 * quart de la barre, sur toutes les pages, a ne rien porter. La recherche
 * s'y installe — c'est la seule action dont on a besoin partout, et elle
 * vivait jusqu'ici au seul sommet de la Bibliotheque.
 *
 * C'est une FEUILLE, posee a cote du contenu, jamais une enveloppe. Une
 * enveloppe cliente ferait envoyer la coquille avant que les pages aient
 * fini de rendre, et le `redirect()` des espaces reserves deviendrait une
 * redirection cliente au lieu d'un 307.
 */

/** Les pages qui prennent l'ecran entier, et sous lesquelles l'en-tete s'efface. */
const PLEIN_ECRAN = ['/app/decouvrir'];

export function EnteteApp({ membre }: { membre: boolean }) {
  const chemin = usePathname();

  if (PLEIN_ECRAN.some((page) => chemin.startsWith(page))) return null;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-[color:var(--color-canvas)]/95 px-4 py-3 backdrop-blur min-[360px]:px-5">
      <Logo className="text-lg" />

      {membre ? (
        // La recherche, enfin atteignable depuis partout. Elle n'existait
        // qu'en tete de la Bibliotheque : pour chercher un nom qu'on
        // connait deja, il fallait d'abord changer de page.
        <Link
          href="/app/bibliotheque?focus=1"
          aria-label="Rechercher une commande"
          className="touch-target inline-flex items-center justify-center rounded-full text-[color:var(--color-night)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
            <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Link>
      ) : (
        // Un visiteur doit pouvoir entrer sans passer par la page Compte :
        // c'est la seule action que la coquille lui doit.
        <Link
          href="/connexion"
          className="touch-target inline-flex items-center rounded-[color:var(--radius-control)] px-2 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-brand)]"
        >
          Se connecter
        </Link>
      )}
    </header>
  );
}
