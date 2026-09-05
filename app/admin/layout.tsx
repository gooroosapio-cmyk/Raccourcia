import Link from 'next/link';

import { Logo } from '@/components/ui/logo';
import { AdminNav } from '@/components/navigation/admin-nav';
import { requireAdmin } from '@/lib/admin/guard';

export const metadata = { title: 'Administration' };

/**
 * Coquille du back-office.
 *
 * Contrainte du cadrage : ajouter, modifier, publier, archiver et uploader un
 * visuel doivent fonctionner au pouce. Le back-office est donc construit avec
 * les memes regles que l'espace membre, pas comme un tableau de bord desktop.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col">
      <header className="sticky top-0 z-30 border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-5 py-3">
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
        <AdminNav />
      </header>

      <main className="flex-1 px-5 pb-16 pt-4">{children}</main>
    </div>
  );
}
