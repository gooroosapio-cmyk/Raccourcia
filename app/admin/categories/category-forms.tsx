'use client';

import { useActionState } from 'react';

import { saveCategory, setCategoryStatus, type AdminActionState } from '@/lib/actions/admin';
import { AdminField, AdminFeedback, AdminSubmit, AdminTextarea } from '@/components/ui/admin-form';
import { StatusBadge } from '@/components/ui/status-badge';
import { MODES, MODE_LABELS } from '@/lib/constants';
import type { AdminCategory } from '@/lib/admin/queries';

/**
 * Gestion des categories.
 *
 * Regle produit centrale : desactiver une categorie masque tous ses raccourcis,
 * sous-categories comprises, sans jamais rien supprimer. L'interface l'annonce
 * avant l'action et le rappelle apres.
 */

function ParentOptions({ categories }: { categories: AdminCategory[] }) {
  return (
    <>
      {categories
        .filter((category) => category.parentId === null)
        .map((parent) => (
          <option key={parent.id} value={parent.id}>
            {MODE_LABELS[parent.mode]} - {parent.name}
          </option>
        ))}
    </>
  );
}

export function CategoryCreateForm({ categories }: { categories: AdminCategory[] }) {
  const [state, action] = useActionState<AdminActionState, FormData>(saveCategory, {});

  return (
    <form action={action} className="space-y-4">
      <AdminField label="Nom" name="name" />
      <AdminField
        label="Slug"
        name="slug"
        hint="Minuscules et tirets. Il apparait dans les adresses."
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
        <span className="text-[13px] font-medium text-[color:var(--color-night)]">
          Categorie parente
        </span>
        <select
          name="parentId"
          defaultValue=""
          className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px]"
        >
          <option value="">Aucune : categorie principale</option>
          <ParentOptions categories={categories} />
        </select>
        <span className="mt-1 block text-[12px] text-[color:var(--color-muted)]">
          Deux niveaux au maximum.
        </span>
      </label>

      <AdminTextarea label="Description courte" name="shortDescription" rows={2} />
      <AdminField
        label="Ordre d affichage"
        name="sortOrder"
        type="number"
        defaultValue="0"
        hint="Le plus petit nombre apparait en premier."
      />

      <AdminFeedback state={state} />
      <AdminSubmit>Creer la categorie</AdminSubmit>
    </form>
  );
}

export function CategoryRow({
  category,
  categories,
  isChild,
}: {
  category: AdminCategory;
  categories: AdminCategory[];
  isChild: boolean;
}) {
  const [statusState, statusAction] = useActionState<AdminActionState, FormData>(
    setCategoryStatus,
    {},
  );
  const [editState, editAction] = useActionState<AdminActionState, FormData>(saveCategory, {});

  const published = category.status === 'published';
  // Une sous-categorie publiee peut rester invisible si son parent est desactive :
  // c'est la cascade, et l'admin doit comprendre pourquoi elle ne voit rien.
  const hiddenByParent = published && !category.isVisible;

  const children = categories.filter((item) => item.parentId === category.id);
  // Desactiver emporte la descendance : on annonce le total reellement masque,
  // pas seulement les raccourcis attaches directement.
  const affectedCount =
    category.promptCount + children.reduce((total, child) => total + child.promptCount, 0);

  return (
    <li
      className={`rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3 ${
        isChild ? 'ml-4' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-[color:var(--color-night)]">
            {category.name}
          </p>
          <p className="text-[12px] text-[color:var(--color-muted)]">
            {category.promptCount} raccourci{category.promptCount > 1 ? 's' : ''}
            {children.length > 0
              ? ` - ${children.length} sous-categorie${children.length > 1 ? 's' : ''}`
              : ''}
          </p>
        </div>
        <StatusBadge status={category.status} />
      </div>

      {hiddenByParent ? (
        <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--color-warning)]">
          Masquee car sa categorie parente est desactivee.
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <form action={statusAction}>
          <input type="hidden" name="categoryId" value={category.id} />
          <input type="hidden" name="status" value={published ? 'draft' : 'published'} />
          <button
            type="submit"
            className={`flex h-11 w-full items-center justify-center rounded-[color:var(--radius-control)] text-[13px] font-medium ${
              published
                ? 'border border-[color:var(--color-line)] text-[color:var(--color-night)]'
                : 'bg-[color:var(--color-brand)] text-white'
            }`}
          >
            {published ? 'Desactiver' : 'Activer'}
          </button>
        </form>

        {category.status !== 'archived' ? (
          <form action={statusAction}>
            <input type="hidden" name="categoryId" value={category.id} />
            <input type="hidden" name="status" value="archived" />
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] text-[13px] font-medium text-[color:var(--color-muted)]"
            >
              Archiver
            </button>
          </form>
        ) : null}
      </div>

      {published ? (
        <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--color-muted)]">
          Desactiver masque {affectedCount} raccourci{affectedCount > 1 ? 's' : ''}
          {children.length > 0 ? ' et toutes ses sous-categories' : ''}. Rien n est supprime.
        </p>
      ) : null}

      <AdminFeedback state={statusState} />

      <details className="mt-3 border-t border-[color:var(--color-line)] pt-3">
        <summary className="touch-target flex cursor-pointer items-center text-[13px] font-medium text-[color:var(--color-brand)]">
          Modifier
        </summary>

        <form action={editAction} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={category.id} />
          <AdminField label="Nom" name="name" defaultValue={category.name} />
          <AdminField label="Slug" name="slug" defaultValue={category.slug} />

          <label className="block">
            <span className="text-[13px] font-medium text-[color:var(--color-night)]">Mode</span>
            <select
              name="mode"
              defaultValue={category.mode}
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
            <span className="text-[13px] font-medium text-[color:var(--color-night)]">
              Categorie parente
            </span>
            <select
              name="parentId"
              defaultValue={category.parentId ?? ''}
              className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px]"
            >
              <option value="">Aucune : categorie principale</option>
              <ParentOptions categories={categories.filter((item) => item.id !== category.id)} />
            </select>
          </label>

          <AdminTextarea
            label="Description courte"
            name="shortDescription"
            rows={2}
            defaultValue={category.shortDescription ?? ''}
          />
          <AdminField
            label="Ordre d affichage"
            name="sortOrder"
            type="number"
            defaultValue={String(category.sortOrder)}
          />

          <AdminFeedback state={editState} />
          <AdminSubmit tone="secondaire">Enregistrer</AdminSubmit>
        </form>
      </details>
    </li>
  );
}
