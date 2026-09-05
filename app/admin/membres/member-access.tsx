'use client';

import { useActionState } from 'react';

import { setMemberAccess, type AdminActionState } from '@/lib/actions/admin';
import { AdminFeedback } from '@/components/ui/admin-form';

/**
 * Accorder ou retirer l'acces a vie, pour le support.
 *
 * Retirer l'acces ne supprime jamais le compte ni l'historique : la fonction
 * de base marque l'acces comme revoque et journalise le motif.
 */
export function MemberAccessForm({ userId, hasAccess }: { userId: string; hasAccess: boolean }) {
  const [state, action] = useActionState<AdminActionState, FormData>(setMemberAccess, {});

  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={hasAccess ? 'false' : 'true'} />

      <label className="block">
        <span className="sr-only">Motif</span>
        <input
          name="reason"
          placeholder="Motif (visible dans le journal)"
          className="h-11 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[14px] outline-none placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-brand)]"
        />
      </label>

      <button
        type="submit"
        className={`flex h-11 w-full items-center justify-center rounded-[color:var(--radius-control)] text-[14px] font-medium ${
          hasAccess
            ? 'border border-[color:var(--color-line)] text-[color:var(--color-danger)]'
            : 'bg-[color:var(--color-brand)] text-white'
        }`}
      >
        {hasAccess ? 'Retirer l acces a vie' : 'Accorder l acces a vie'}
      </button>

      <AdminFeedback state={state} />
    </form>
  );
}
