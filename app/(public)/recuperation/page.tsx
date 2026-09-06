import Link from 'next/link';
import { RecoverForm } from '@/app/(public)/recuperation/recover-form';

export const metadata = { title: 'Récupérer mon accès' };

export default function RecoveryPage() {
  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="text-2xl font-semibold text-[color:var(--color-night)]">
        Récupérer mon accès
      </h1>
      <p className="mt-1 text-[15px] leading-relaxed text-[color:var(--color-muted)]">
        Indiquez l’email de votre achat et votre licence, puis définissez un nouveau mot de passe.
      </p>

      <RecoverForm />

      <p className="mt-6 text-[14px] text-[color:var(--color-muted)]">
        Licence introuvable ?{' '}
        <Link href="/connexion" className="font-medium text-[color:var(--color-brand)]">
          Revenir à la connexion
        </Link>
      </p>
    </div>
  );
}
