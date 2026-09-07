import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { AuthCloseLink } from '@/components/navigation/auth-close-link';
import { LegalFooter } from '@/components/navigation/legal-footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col px-5 pb-10 lg:max-w-3xl">
      <header className="flex items-center justify-between py-4">
        <Link href="/" aria-label="Accueil RaccourcIA">
          <Logo className="text-lg" />
        </Link>

        {/* N'apparait que sur les ecrans de connexion, d'activation et de
            recuperation : ailleurs, il n'y a rien a refermer. */}
        <AuthCloseLink />
      </header>
      <main className="flex-1">{children}</main>
      <LegalFooter className="mt-10 pt-6" />
    </div>
  );
}
