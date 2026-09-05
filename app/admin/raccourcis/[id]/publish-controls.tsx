'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { setPromptStatus, type AdminActionState } from '@/lib/actions/admin';
import { AdminFeedback } from '@/components/ui/admin-form';
import type { Enums } from '@/lib/supabase/database.types';

/**
 * Publication et retrait.
 *
 * Publier passe par une fonction de base qui refuse un contenu incomplet :
 * si un element manque, le message le dit precisement. Rien n'est jamais
 * supprime : on archive.
 */
export function PromptPublishControls({
  promptId,
  status,
  slug,
}: {
  promptId: string;
  status: Enums<'content_status'>;
  slug: string;
}) {
  const [state, action] = useActionState<AdminActionState, FormData>(setPromptStatus, {});

  return (
    <div className="space-y-3 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
      <div className="grid grid-cols-2 gap-2">
        {status !== 'published' ? (
          <form action={action} className="col-span-2">
            <input type="hidden" name="promptId" value={promptId} />
            <input type="hidden" name="status" value="published" />
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] text-[15px] font-medium text-white"
            >
              Publier
            </button>
          </form>
        ) : (
          <form action={action}>
            <input type="hidden" name="promptId" value={promptId} />
            <input type="hidden" name="status" value="draft" />
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] text-[14px] font-medium text-[color:var(--color-night)]"
            >
              Repasser en brouillon
            </button>
          </form>
        )}

        {status !== 'archived' ? (
          <form action={action} className={status === 'published' ? '' : 'col-span-2'}>
            <input type="hidden" name="promptId" value={promptId} />
            <input type="hidden" name="status" value="archived" />
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] text-[14px] font-medium text-[color:var(--color-muted)]"
            >
              Archiver
            </button>
          </form>
        ) : null}
      </div>

      {status === 'published' ? (
        <Link
          href={`/r/${slug}`}
          className="block text-center text-[13px] font-medium text-[color:var(--color-brand)]"
        >
          Voir la page publique
        </Link>
      ) : null}

      <AdminFeedback state={state} />
    </div>
  );
}
