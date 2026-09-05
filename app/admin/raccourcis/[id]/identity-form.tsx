'use client';

import { useActionState } from 'react';

import { updatePromptIdentity, type AdminActionState } from '@/lib/actions/admin';
import {
  AdminField,
  AdminFeedback,
  AdminSubmit,
  AdminTextarea,
  AdminToggle,
} from '@/components/ui/admin-form';
import { MODES, MODE_LABELS } from '@/lib/constants';
import type { AdminCategory, AdminPromptDetail } from '@/lib/admin/queries';

/**
 * Bloc Identite du formulaire.
 *
 * `show_image_card` est ici une decision editoriale explicite : les prompts
 * texte n'affichent aucune carte image imposee, c'est une regle produit.
 */
export function PromptIdentityForm({
  prompt,
  categories,
}: {
  prompt: AdminPromptDetail;
  categories: AdminCategory[];
}) {
  const [state, action] = useActionState<AdminActionState, FormData>(updatePromptIdentity, {});

  // Les sous-categories sont indentees pour rendre la hierarchie lisible.
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
      <input type="hidden" name="promptId" value={prompt.id} />

      <AdminField label="Commande" name="command" defaultValue={prompt.command} />
      <AdminField label="Titre" name="name" defaultValue={prompt.name} />
      <AdminTextarea
        label="Description courte"
        name="shortDescription"
        defaultValue={prompt.shortDescription}
        rows={2}
        hint="Une phrase orientee resultat, visible sur la carte."
      />

      <label className="block">
        <span className="text-[13px] font-medium text-[color:var(--color-night)]">Mode</span>
        <select
          name="mode"
          defaultValue={prompt.mode}
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
          defaultValue={prompt.categoryId ?? ''}
          className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px]"
        >
          <option value="">Aucune categorie</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[12px] text-[color:var(--color-muted)]">
          Une categorie est obligatoire pour publier.
        </span>
      </label>

      <AdminTextarea
        label="Cas d usage"
        name="useCases"
        defaultValue={prompt.useCases.join('\n')}
        rows={3}
        hint="Un par ligne, 3 maximum affiches. Surtout utile pour les prompts ecrits."
      />
      <AdminTextarea
        label="Tags"
        name="tags"
        defaultValue={prompt.tags.join('; ')}
        rows={2}
        hint="Separes par un point-virgule."
      />
      <AdminTextarea
        label="Conseil d utilisation"
        name="expectedInput"
        defaultValue={prompt.expectedInput ?? ''}
        rows={2}
        hint='Exemple : "Ajoutez votre image avec le prompt."'
      />
      <AdminTextarea
        label="Limites"
        name="limitations"
        defaultValue={prompt.limitations ?? ''}
        rows={2}
        hint="Affichees dans la fiche pour les commandes sensibles."
      />
      <AdminTextarea
        label="Notes internes"
        name="adminNotes"
        defaultValue={prompt.adminNotes ?? ''}
        rows={2}
        hint="Jamais visibles par les membres."
      />
      <AdminTextarea
        label="Intention"
        name="intention"
        defaultValue={prompt.intention ?? ''}
        rows={2}
      />

      <div className="space-y-2 rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)] p-3">
        <AdminToggle
          label="Carte avec visuel"
          name="showImageCard"
          defaultChecked={prompt.showImageCard}
          hint="A laisser desactive pour les prompts texte."
        />
        <AdminToggle
          label="Gratuit"
          name="isFree"
          defaultChecked={prompt.isFree}
          hint="Copiable sans achat, sert de demonstration."
        />
        <AdminToggle label="Mis en avant" name="isFeatured" defaultChecked={prompt.isFeatured} />
        <AdminToggle label="Nouveau" name="isNew" defaultChecked={prompt.isNew} />
      </div>

      <AdminFeedback state={state} />
      <AdminSubmit>Enregistrer l identite</AdminSubmit>
    </form>
  );
}
