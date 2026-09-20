'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Barre basse : cinq destinations, libelles toujours visibles.
 *
 * Accueil dit ce que RaccourcIA sait faire ; Decouvrir montre ce qu'il
 * produit ; Bibliotheque range ; Favoris garde ; Profil administre.
 *
 * « Decouvrir » se place au milieu, et pas au bout. C'est la page qu'on
 * vise le plus souvent apres l'Accueil, et le centre d'une barre a cinq est
 * l'endroit le plus court pour un pouce, quelle que soit la main.
 *
 * Cinq tient sur 360 px : chaque destination dispose de 72 px, soit bien
 * au-dela des 44 px de cible confortable. Les libelles restent — une barre
 * d'icones muettes se devine, elle ne se lit pas — et se resserrent d'un
 * pixel plutot que de disparaitre.
 */
const ITEMS = [
  { href: '/app', label: 'Accueil', icon: HomeIcon },
  { href: '/app/bibliotheque', label: 'Bibliothèque', icon: LibraryIcon },
  { href: '/app/decouvrir', label: 'Découvrir', icon: CompassIcon },
  { href: '/app/favoris', label: 'Favoris', icon: HeartIcon },
  { href: '/compte', label: 'Profil', icon: AccountIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-screen-sm">
        {ITEMS.map((item) => {
          const active =
            item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`touch-target flex flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-center text-[10.5px] font-medium leading-tight ${
                  active ? 'text-[color:var(--color-brand)]' : 'text-[color:var(--color-muted)]'
                }`}
              >
                <Icon />
                {/* Le libelle ne se coupe pas : « Bibliothèque » tient sur
                    une ligne a 10,5 px dans 72 px de large. */}
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5.5H9V20H5a1 1 0 0 1-1-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 0 1 19.4 13Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="4" width="7" height="16" rx="1.6" stroke="currentColor" strokeWidth="2" />
      <rect x="13.5" y="4" width="7" height="16" rx="1.6" stroke="currentColor" strokeWidth="2" />
      <path d="M3.5 10h7M13.5 10h7" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Une boussole pour Decouvrir.
 *
 * Ni loupe ni etoile : la loupe dit « cherche », or on ne cherche pas ici —
 * on regarde ce qui vient. L'aiguille dit l'exploration sans promettre un
 * champ de saisie.
 */
function CompassIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m15.5 8.5-2 5-5 2 2-5 5-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
