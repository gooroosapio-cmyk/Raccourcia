import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Logo } from '@/components/ui/logo';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { PaywallProvider } from '@/components/paywall/paywall-provider';
import { ToastProvider } from '@/components/ui/toast';
import { deviceLabelFromUserAgent, getUser, registerCurrentSession } from '@/lib/auth/session';
import { getAccessState } from '@/lib/access/entitlement';
import { getCatalogCounts, getPublicConfig } from '@/lib/catalog/queries';

/**
 * Coquille de l'espace membre : en-tete compact, contenu, barre basse.
 * Aucun hero marketing ici (Spec UX/UI, 5).
 */
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/connexion');

  // L'appareil courant est enregistre a chaque entree dans l'espace membre :
  // c'est ce qui alimente Compte > Mes appareils.
  const headerList = await headers();
  await registerCurrentSession(deviceLabelFromUserAgent(headerList.get('user-agent')));

  const [{ hasLifetimeAccess }, config, counts] = await Promise.all([
    getAccessState(),
    getPublicConfig(),
    getCatalogCounts(),
  ]);

  return (
    <ToastProvider>
      <div className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col lg:max-w-6xl">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-[color:var(--color-canvas)]/95 px-5 py-3 backdrop-blur">
          <Logo className="text-lg" />
        </header>
        {/*
          La fenetre d'offre lit les parametres d'URL : Next impose une
          frontiere Suspense autour de `useSearchParams`. Le repli est le
          contenu nu, jamais une page vide.
        */}
        <Suspense fallback={<main className="flex-1 px-5 pb-24">{children}</main>}>
          <PaywallProvider
            hasAccess={hasLifetimeAccess}
            offre={{
              purchaseUrl: config.purchaseUrl,
              price: config.price,
              freeCount: counts.free,
              totalCount: counts.total,
            }}
          >
            <main className="flex-1 px-5 pb-24">{children}</main>
          </PaywallProvider>
        </Suspense>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
