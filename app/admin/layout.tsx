import Link from 'next/link';

import { Logo } from '@/components/ui/logo';
import { AdminNav } from '@/components/navigation/admin-nav';
import { requireAdmin } from '@/lib/admin/guard';

export const metadata = { title: 'Administration' };

/**
 * Coquille du back-office.
 *
 * Contrainte du cadrage : ajouter, modifier, publier, archiver et uploader un
 * visuel doivent fonctionner au pouce. Sur mobile, une colonne et un menu
 * compact ; sur ordinateur, une barre laterale et une zone de travail plus
 * large (rapport de refonte, p. 11).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="coquille mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col lg:max-w-6xl">
      <header className="sticky top-0 z-30 border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-[var(--marge-coquille)] py-3">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo className="text-base" />
            <span className="rounded-full bg-[color:var(--color-sky)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--color-night)]">
              Admin
            </span>
          </Link>
          <Link
            href="/app"
            className="touch-target inline-flex items-center text-[13px] font-medium text-[color:var(--color-brand)]"
          >
            Voir le site
          </Link>
        </div>
        {/* Mobile : la section courante et un menu compact. */}
        <div className="lg:hidden">
          <AdminNav variante="menu" />
        </div>
      </header>

      <div className="flex-1 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        {/* Ordinateur : la barre laterale, toujours visible. */}
        <aside className="hidden border-r border-[color:var(--color-line)] py-4 pr-4 lg:block">
          <AdminNav variante="laterale" />
        </aside>
        <main className="min-w-0 px-[var(--marge-coquille)] pb-16 pt-4 lg:px-0">{children}</main>
      </div>
    </div>
  );
}
