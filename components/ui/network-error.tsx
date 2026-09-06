'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/**
 * Etat d'erreur reseau. On conserve le contexte, on explique en une phrase,
 * et on propose toujours une action (Spec UX/UI, 17.1). Jamais d'ecran mort,
 * jamais un message technique.
 *
 * Les pages l'affichent elles-memes plutot que de compter sur error.tsx :
 * une erreur levee pendant le rendu serveur initial produit sinon un 500
 * a corps vide, donc une page blanche.
 */
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const retry = () => {
    if (onRetry) onRetry();
    else startTransition(() => router.refresh());
  };

  return (
    <div
      role="alert"
      className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 text-center"
    >
      <p className="text-[15px] font-medium text-[color:var(--color-night)]">
        Connexion interrompue.
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
        Vos commandes sont bien là. Réessayez dans un instant.
      </p>
      <button
        type="button"
        onClick={retry}
        disabled={pending}
        className="mt-4 inline-flex h-11 items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-4 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? 'Nouvelle tentative...' : 'Réessayer'}
      </button>
    </div>
  );
}
