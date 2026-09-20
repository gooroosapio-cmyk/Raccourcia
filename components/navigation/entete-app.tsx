'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/logo';

/**
 * L'en-tete de la coquille : le logo, et ce qui manquait a droite.
 *
 * DEUX RAISONS D'ETRE UN COMPOSANT CLIENT. La premiere : sur Decouvrir,
 * chaque carte occupe l'ecran entier, et un bandeau opaque en haut coupe
 * l'image en deux. Seule la page sait qu'elle est plein ecran ; le chemin
 * le dit aussi, et il est lisible ici sans rien plomber.
 *
 * On avait d'abord essaye une regle CSS `body:has([data-plein-ecran])`.
 * Elle a l'elegance de ne rien coupler — mais elle depend de la forme
 * exacte de l'arbre rendu, et elle n'a pas pris. Un chemin compare a une
 * constante ne depend de rien.
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
  const transparent = PLEIN_ECRAN.some((page) => chemin.startsWith(page));

  return (
    <header
      className={`sticky top-0 z-30 flex items-center justify-between px-4 py-3 min-[360px]:px-5 ${
        transparent
          ? // Aucun fond, et un voile sombre par-dessus l'image : sans lui,
            // le logo passerait du noir sur fond clair au noir sur fond noir
            // selon la carte affichee.
            'bg-gradient-to-b from-black/55 to-transparent text-white'
          : 'bg-[color:var(--color-canvas)]/95 backdrop-blur'
      }`}
    >
      <Logo className="text-lg" />

      {membre ? (
        // La recherche, enfin atteignable depuis partout. Elle n'existait
        // qu'en tete de la Bibliotheque : pour chercher un nom qu'on
        // connait deja, il fallait d'abord changer de page.
        <Link
          href="/app/bibliotheque?focus=1"
          aria-label="Rechercher une commande"
          className={`touch-target inline-flex items-center justify-center rounded-full ${
            transparent ? 'text-white' : 'text-[color:var(--color-night)]'
          }`}
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
          className={`touch-target inline-flex items-center rounded-[color:var(--radius-control)] px-2 text-[length:var(--texte-carte)] font-medium ${
            transparent ? 'text-white' : 'text-[color:var(--color-brand)]'
          }`}
        >
          Se connecter
        </Link>
      )}
    </header>
  );
}
