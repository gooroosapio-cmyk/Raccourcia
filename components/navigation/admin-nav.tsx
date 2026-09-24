'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

/**
 * Les sept sections de l'administration (rapport de refonte, p. 11).
 *
 * « Organisation » reunit categories et tags : les deux rangent le
 * catalogue, et deux entrees de menu pour une seule question faisaient
 * chercher. « Statistiques » remplace « Analytics » : l'interface ne parle
 * pas le vocabulaire technique.
 */
const SECTIONS = [
  { href: '/admin', label: 'Vue d’ensemble', actif: (p: string) => p === '/admin' },
  {
    href: '/admin/raccourcis',
    label: 'Catalogue',
    actif: (p: string) => p.startsWith('/admin/raccourcis'),
  },
  {
    href: '/admin/categories',
    label: 'Organisation',
    actif: (p: string) => p.startsWith('/admin/categories') || p.startsWith('/admin/tags'),
  },
  { href: '/admin/medias', label: 'Médias', actif: (p: string) => p.startsWith('/admin/medias') },
  {
    href: '/admin/membres',
    label: 'Membres',
    actif: (p: string) => p.startsWith('/admin/membres'),
  },
  {
    href: '/admin/analytics',
    label: 'Statistiques',
    actif: (p: string) => p.startsWith('/admin/analytics'),
  },
  {
    href: '/admin/parametres',
    label: 'Paramètres',
    actif: (p: string) => p.startsWith('/admin/parametres'),
  },
] as const;

/**
 * Sur ordinateur, une barre laterale : les sept sections toujours visibles.
 * Sur mobile, le nom de la section courante et un menu compact — plus de
 * rangee d'onglets qui defile hors de l'ecran, ou la moitie des sections
 * etait invisible sans qu'on le sache.
 */
export function AdminNav({ variante }: { variante: 'menu' | 'laterale' }) {
  const pathname = usePathname();
  const courante = SECTIONS.find((section) => section.actif(pathname)) ?? SECTIONS[0];
  // Le menu retient la page ou il a ete ouvert : sur une autre page, il est
  // ferme — il a fait son office, sans effet a synchroniser.
  const [ouvertSur, setOuvertSur] = useState<string | null>(null);
  const ouvert = ouvertSur === pathname;

  const liens = (
    <ul className={variante === 'laterale' ? 'space-y-0.5' : 'py-1'}>
      {SECTIONS.map((section) => {
        const actif = section === courante;
        return (
          <li key={section.href}>
            <Link
              href={section.href}
              aria-current={actif ? 'page' : undefined}
              className={`flex min-h-11 items-center rounded-[color:var(--radius-control)] px-3 text-[15px] font-medium transition-colors duration-[var(--duration-fast)] ${
                actif
                  ? 'bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-strong)]'
                  : 'text-[color:var(--color-night)] hover:bg-[color:var(--color-canvas)]'
              }`}
            >
              {section.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  if (variante === 'laterale') {
    return (
      <nav aria-label="Sections d’administration" className="sticky top-4">
        <p className="px-3 pb-2 text-[12px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
          Administration
        </p>
        {liens}
      </nav>
    );
  }

  return (
    <nav aria-label="Sections d’administration" className="relative mt-2">
      <button
        type="button"
        onClick={() => setOuvertSur(ouvert ? null : pathname)}
        aria-expanded={ouvert}
        aria-controls="menu-admin"
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px] font-semibold text-[color:var(--color-night)]"
      >
        <span>
          <span className="sr-only">Section : </span>
          {courante.label}
        </span>
        <span className="flex items-center gap-1 text-[13px] font-medium text-[color:var(--color-muted)]">
          Menu
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={`transition-transform duration-[var(--duration-fast)] ${ouvert ? 'rotate-180' : ''}`}
          >
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {ouvert ? (
        <div
          id="menu-admin"
          className="absolute inset-x-0 top-full z-40 mt-1 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-1 shadow-[var(--shadow-card)]"
        >
          {liens}
        </div>
      ) : null}
    </nav>
  );
}
