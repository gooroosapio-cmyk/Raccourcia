import Link from 'next/link';
import { SignInForm } from '@/app/(public)/connexion/sign-in-form';

export const metadata = { title: 'Connexion' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>;
}) {
  const { suite } = await searchParams;

  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="text-2xl font-semibold text-[color:var(--color-night)]">Se connecter</h1>
      <p className="mt-1 text-[15px] text-[color:var(--color-muted)]">
        Retrouvez votre bibliothèque de commandes.
      </p>

      <SignInForm suite={suite} />

      <div className="mt-6 space-y-2 text-[14px]">
        <p className="text-[color:var(--color-muted)]">
          Vous venez d acheter ?{' '}
          <Link href="/activation" className="font-medium text-[color:var(--color-brand)]">
            Activer mon accès
          </Link>
        </p>
        <p className="text-[color:var(--color-muted)]">
          Mot de passe oublie ?{' '}
          <Link href="/recuperation" className="font-medium text-[color:var(--color-brand)]">
            Récupérer avec ma licence
          </Link>
        </p>
      </div>
    </div>
  );
}
