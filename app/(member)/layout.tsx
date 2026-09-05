import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Logo } from '@/components/ui/logo';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { deviceLabelFromUserAgent, getUser, registerCurrentSession } from '@/lib/auth/session';

/**
 * Coquille de l'espace membre : header compact, contenu, barre basse.
 * Aucun hero marketing ici (Spec UX/UI, 5).
 */
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/connexion');

  // L'appareil courant est enregistre a chaque entree dans l'espace membre :
  // c'est ce qui alimente Compte > Mes appareils.
  const headerList = await headers();
  await registerCurrentSession(deviceLabelFromUserAgent(headerList.get('user-agent')));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-[color:var(--color-canvas)]/95 px-5 py-3 backdrop-blur">
        <Logo className="text-lg" />
      </header>
      <main className="flex-1 px-5 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
