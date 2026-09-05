'use client';

import { useActionState } from 'react';
import { revokeSession, type ActionState } from '@/lib/actions/auth';
import type { Tables } from '@/lib/supabase/database.types';

/** Mes appareils : deconnexion explicite, jamais silencieuse. */
export function DeviceList({ sessions }: { sessions: Tables<'app_sessions'>[] }) {
  const [state, action] = useActionState<ActionState, FormData>(revokeSession, {});

  if (sessions.length === 0) {
    return (
      <p className="mt-3 text-[13px] text-[color:var(--color-muted)]">Aucun appareil enregistre.</p>
    );
  }

  return (
    <>
      <ul className="mt-3 divide-y divide-[color:var(--color-line)]">
        {sessions.map((session) => (
          <li key={session.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] text-[color:var(--color-ink)]">
                {session.device_label ?? 'Appareil'}
              </p>
              <p className="text-[12px] text-[color:var(--color-muted)]">
                Vu le{' '}
                {new Date(session.last_seen_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>
            <form action={action}>
              <input type="hidden" name="sessionId" value={session.id} />
              <button
                type="submit"
                className="touch-target rounded-[color:var(--radius-control)] px-3 text-[13px] font-medium text-[color:var(--color-danger)]"
              >
                Deconnecter
              </button>
            </form>
          </li>
        ))}
      </ul>
      {state.error ? (
        <p role="alert" className="mt-2 text-[13px] text-[color:var(--color-danger)]">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="mt-2 text-[13px] text-[color:var(--color-success)]">
          {state.success}
        </p>
      ) : null}
    </>
  );
}
