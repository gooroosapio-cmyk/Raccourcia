'use client';

import { useActionState } from 'react';

import { setConfigValue, type AdminActionState } from '@/lib/actions/admin';
import { AdminFeedback, AdminSubmit } from '@/components/ui/admin-form';
import type { AdminConfigEntry } from '@/lib/admin/queries';

/**
 * Un reglage, un formulaire.
 *
 * Les valeurs sont stockees en JSON : le type lu en base decide du champ
 * propose, pour eviter qu'une faute de frappe casse un reglage booleen.
 */
export function ConfigForm({ entry, label }: { entry: AdminConfigEntry; label: string }) {
  const [state, action] = useActionState<AdminActionState, FormData>(setConfigValue, {});

  return (
    <form
      action={action}
      className="space-y-3 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4"
    >
      <input type="hidden" name="key" value={entry.key} />

      <div>
        <p className="text-[15px] font-medium text-[color:var(--color-night)]">{label}</p>
        {entry.description ? (
          <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--color-muted)]">
            {entry.description}
          </p>
        ) : null}
      </div>

      {entry.kind === 'booleen' ? (
        <label className="block">
          <span className="sr-only">Valeur</span>
          <select
            name="value"
            defaultValue={entry.value}
            className="h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px]"
          >
            <option value="true">Active</option>
            <option value="false">Desactive</option>
          </select>
        </label>
      ) : (
        <label className="block">
          <span className="sr-only">Valeur</span>
          <input
            name="value"
            type={entry.kind === 'nombre' ? 'number' : 'text'}
            defaultValue={entry.value}
            required
            className="h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px] outline-none focus:border-[color:var(--color-brand)]"
          />
        </label>
      )}

      <AdminFeedback state={state} />
      <AdminSubmit tone="secondaire">Enregistrer</AdminSubmit>
    </form>
  );
}
