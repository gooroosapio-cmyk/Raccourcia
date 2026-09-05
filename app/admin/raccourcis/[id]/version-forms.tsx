'use client';

import { useActionState } from 'react';

import { savePromptVersion, setVariantPublished, type AdminActionState } from '@/lib/actions/admin';
import { AdminFeedback, AdminSubmit, AdminTextarea } from '@/components/ui/admin-form';
import type { AdminPromptDetail } from '@/lib/admin/queries';

/**
 * Un bloc par IA.
 *
 * Enregistrer ne modifie jamais la version en place : la base cree une
 * nouvelle version courante et retire l'ancienne, qui reste consultable.
 */
export function PromptVersionForms({
  promptId,
  variants,
}: {
  promptId: string;
  variants: AdminPromptDetail['variants'];
}) {
  if (variants.length === 0) {
    return (
      <p className="text-[13px] text-[color:var(--color-muted)]">
        Aucune IA configuree pour ce raccourci.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {variants.map((variant) => (
        <VariantBlock key={variant.variantId} promptId={promptId} variant={variant} />
      ))}
    </div>
  );
}

function VariantBlock({
  promptId,
  variant,
}: {
  promptId: string;
  variant: AdminPromptDetail['variants'][number];
}) {
  const [versionState, saveAction] = useActionState<AdminActionState, FormData>(
    savePromptVersion,
    {},
  );
  const [statusState, statusAction] = useActionState<AdminActionState, FormData>(
    setVariantPublished,
    {},
  );

  const published = variant.variantStatus === 'published';

  return (
    <div className="rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-[color:var(--color-night)]">
            {variant.providerName}
          </p>
          <p className="text-[12px] text-[color:var(--color-muted)]">
            {variant.versionLabel ? `Version ${variant.versionLabel}` : 'Aucun prompt enregistre'}
          </p>
        </div>

        <form action={statusAction}>
          <input type="hidden" name="promptId" value={promptId} />
          <input type="hidden" name="variantId" value={variant.variantId} />
          <input type="hidden" name="published" value={published ? 'false' : 'true'} />
          <button
            type="submit"
            className={`touch-target rounded-full px-3 text-[13px] font-medium ${
              published
                ? 'bg-[#E9F7EF] text-[color:var(--color-success)]'
                : 'bg-[color:var(--color-canvas)] text-[color:var(--color-muted)]'
            }`}
          >
            {published ? 'Active' : 'Desactivee'}
          </button>
        </form>
      </div>

      <AdminFeedback state={statusState} />

      <form action={saveAction} className="mt-3 space-y-3">
        <input type="hidden" name="promptId" value={promptId} />
        <input type="hidden" name="variantId" value={variant.variantId} />
        <AdminTextarea
          label="Prompt complet"
          name="payload"
          rows={10}
          mono
          required
          defaultValue={variant.payload ?? ''}
          hint="C est ce texte que le membre recoit dans son presse-papiers."
        />
        <AdminFeedback state={versionState} />
        <AdminSubmit tone="secondaire">Enregistrer une nouvelle version</AdminSubmit>
      </form>
    </div>
  );
}
