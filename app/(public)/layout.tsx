import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { LegalFooter } from '@/components/navigation/legal-footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col px-5 pb-10 lg:max-w-3xl">
      <header className="py-4">
        <Link href="/" aria-label="Accueil RaccourcIA">
          <Logo className="text-lg" />
        </Link>
      </header>
      <main className="flex-1">{children}</main>
      <LegalFooter className="mt-10 pt-6" />
    </div>
  );
}
