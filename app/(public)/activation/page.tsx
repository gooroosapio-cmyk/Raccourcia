import Link from 'next/link';
import { ClaimForm } from '@/app/(public)/activation/claim-form';

export const metadata = { title: 'Activer mon accès' };

export default function ActivationPage() {
  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="text-2xl font-semibold text-[color:var(--color-night)]">Activer mon accès</h1>
      <p className="mt-1 text-[15px] leading-relaxed text-[color:var(--color-muted)]">
        Utilisez l email de votre achat et la licence recue, puis choisissez un mot de passe. Votre
        acces RaccourcIA est actif a vie.
      </p>

      <ClaimForm />

      <p className="mt-6 text-[14px] text-[color:var(--color-muted)]">
        Vous avez deja un compte ?{' '}
        <Link href="/connexion" className="font-medium text-[color:var(--color-brand)]">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
