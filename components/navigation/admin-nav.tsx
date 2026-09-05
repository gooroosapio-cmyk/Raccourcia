'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Navigation du back-office : une seule ligne, defilement horizontal. */
const SECTIONS = [
  { href: '/admin', label: 'Tableau de bord' },
  { href: '/admin/raccourcis', label: 'Raccourcis' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/membres', label: 'Membres' },
  { href: '/admin/parametres', label: 'Parametres' },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections d administration" className="-mx-5 mt-3 overflow-x-auto px-5">
      <ul className="flex w-max gap-2">
        {SECTIONS.map((section) => {
          const active =
            section.href === '/admin' ? pathname === '/admin' : pathname.startsWith(section.href);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex h-9 items-center whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition-colors duration-[var(--duration-fast)] ${
                  active
                    ? 'bg-[color:var(--color-brand)] text-white'
                    : 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]'
                }`}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
