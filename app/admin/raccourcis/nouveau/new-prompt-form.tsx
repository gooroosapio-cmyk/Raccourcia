'use client';

import { useActionState } from 'react';

import { createPrompt, type AdminActionState } from '@/lib/actions/admin';
import { AdminField, AdminFeedback, AdminSubmit, AdminTextarea } from '@/components/ui/admin-form';
import { MODES, MODE_LABELS } from '@/lib/constants';
import type { AdminCategory } from '@/lib/admin/queries';

/**
 * Creation d'un raccourci : le strict minimum.
 *
 * Tout le reste (prompt complet, visuels, options) se remplit sur la fiche,
 * une fois le raccourci cree. Le raccourci nait en brouillon, donc invisible :
 * on peut le laisser inacheve sans risque.
 */
export function NewPromptForm({ categories }: { categories: AdminCategory[] }) {
  const [state, action] = useActionState<AdminActionState, FormData>(createPrompt, {});

  const options = categories
    .filter((category) => category.parentId === null)
    .flatMap((parent) => [
      { id: parent.id, label: `${MODE_LABELS[parent.mode]} - ${parent.name}` },
      ...categories
        .filter((child) => child.parentId === parent.id)
        .map((child) => ({
          id: child.id,
          label: `${MODE_LABELS[parent.mode]} - ${parent.name} > ${child.name}`,
        })),
    ]);

  return (
    <form action={action} className="space-y-4">
      <AdminField
        label="Commande"
        name="command"
        hint="Commence par une barre oblique, en minuscules. Exemple : /portrait-studio"
      />
      <AdminField label="Titre" name="name" hint="Ce que le membre lit sur la carte." />
      <AdminTextarea
        label="Description courte"
        name="shortDescription"
        rows={2}
        required
        hint="Une phrase orientee resultat."
      />

      <label className="block">
        <span className="text-[13px] font-medium text-[color:var(--color-night)]">Mode</span>
        <select
          name="mode"
          defaultValue="image"
          className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px]"
        >
          {MODES.map((mode) => (
            <option key={mode} value={mode}>
              {MODE_LABELS[mode]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-[13px] font-medium text-[color:var(--color-night)]">Categorie</span>
        <select
          name="categoryId"
          defaultValue=""
          className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px]"
        >
          <option value="">A classer plus tard</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[12px] text-[color:var(--color-muted)]">
          Une categorie sera obligatoire au moment de publier.
        </span>
      </label>

      <AdminFeedback state={state} />
      <AdminSubmit>Creer le brouillon</AdminSubmit>
    </form>
  );
}
