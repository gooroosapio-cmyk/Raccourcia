import Link from 'next/link';
import { headers } from 'next/headers';
import { Logo } from '@/components/ui/logo';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { PaywallLayer } from '@/components/paywall/paywall-provider';
import { Toaster } from '@/components/ui/toast';
import { deviceLabelFromUserAgent, getUser, registerCurrentSession } from '@/lib/auth/session';
import { getAccessState } from '@/lib/access/entitlement';
import { getPublicConfig } from '@/lib/catalog/queries';

/**
 * Coquille de la bibliotheque : en-tete compact, contenu, barre basse.
 * Aucun hero marketing ici (Spec UX/UI, 5).
 *
 * Elle s'ouvre aussi aux visiteurs. Demander un compte pour seulement
 * regarder revenait a vendre une bibliotheque sans jamais en montrer les
 * rayons : le bouton « Decouvrir les commandes » de l'accueil menait a un
 * formulaire de connexion. Ce qui se paie n'est pas la vue des cartes mais le
 * contenu des commandes, et celui-ci ne sort que par `resolve_prompt`, qui
 * exige un compte et un droit actif — regarder ne donne rien a copier.
 *
 * Aucun composant client n'enveloppe `children`. Une enveloppe cliente fait
 * envoyer la coquille avant que la page ait fini de rendre : le `redirect()`
 * des espaces reserves partirait alors dans la charge RSC, et ne s'executerait
 * que si JavaScript tourne. La fenetre d'offre et les messages courts sont
 * donc des feuilles, posees a cote du contenu.
 */
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  // L'appareil courant est enregistre a chaque entree, et seulement pour un
  // compte connecte : un visiteur n'a pas d'appareil a inscrire au journal.
  if (user) {
    const headerList = await headers();
    await registerCurrentSession(deviceLabelFromUserAgent(headerList.get('user-agent')));
  }

  const [acces, config] = await Promise.all([getAccessState(), getPublicConfig()]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col lg:max-w-6xl">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-[color:var(--color-canvas)]/95 px-5 py-3 backdrop-blur">
        <Logo className="text-lg" />

        {/* Un visiteur doit pouvoir entrer sans passer par la page Compte :
            c'est la seule action que la coquille lui doit. */}
        {!acces.isMember ? (
          <Link
            href="/connexion"
            className="touch-target inline-flex items-center rounded-[color:var(--radius-control)] px-2 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-brand)]"
          >
            Se connecter
          </Link>
        ) : null}
      </header>

      <main className="flex-1 px-5 pb-24">{children}</main>

      <BottomNav />

      {/* L'offre ne se propose ni a qui l'a deja achetee, ni a l'equipe :
          `hasFullAccess` couvre les deux. */}
      <PaywallLayer
        hasAccess={acces.hasFullAccess}
        offre={{ purchaseUrl: config.purchaseUrl, price: config.price }}
      />
      <Toaster />
    </div>
  );
}
