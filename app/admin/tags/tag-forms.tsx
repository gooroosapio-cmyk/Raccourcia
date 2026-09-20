'use client';

import { useActionState, useState } from 'react';

import { enregistrerTag, supprimerTag, type AdminActionState } from '@/lib/actions/admin';
import { AdminField, AdminFeedback, AdminSubmit, AdminTextarea } from '@/components/ui/admin-form';
import { TAG_GROUPS, TAG_GROUP_LABELS } from '@/lib/constants';
import type { TagAdmin } from '@/lib/admin/tags';

/**
 * Creation et reglage d'un tag.
 *
 * Le slug se normalise dans la base : accents, espaces et majuscules y sont
 * ramenes a une forme unique, et l'unicite fait le reste. C'est ce qui
 * empeche « mode-ia » et « modes-ia » de redevenir deux idees — le defaut
 * precis qui a rendu l'ancienne colonne de tags libres inutilisable.
 */

function ChoixDeGroupe({ defaultValue = 'fonction' }: { defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-[color:var(--color-night)]">Famille</span>
      <select
        name="groupe"
        defaultValue={defaultValue}
        className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px]"
      >
        {TAG_GROUPS.map((groupe) => (
          <option key={groupe} value={groupe}>
            {TAG_GROUP_LABELS[groupe]}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-[12px] text-[color:var(--color-muted)]">
        « Bibliothèque » et « IA compatible » ne sont pas proposés à l’exploration : ce sont déjà
        deux filtres de l’accueil.
      </span>
    </label>
  );
}

export function TagCreateForm() {
  const [state, action] = useActionState<AdminActionState, FormData>(enregistrerTag, {});

  return (
    <form action={action} className="space-y-4">
      <AdminField label="Nom" name="name" />
      <AdminField
        label="Identifiant"
        name="slug"
        hint="Il apparaît dans les adresses. Les accents et les espaces sont ramenés à une forme unique."
      />
      <ChoixDeGroupe />
      <AdminTextarea label="Description" name="description" rows={2} />
      <AdminField
        label="Visuel"
        name="imagePath"
        hint="Chemin d’un visuel déjà déposé. Sans visuel, la tuile reste typographique."
      />
      <AdminField
        label="Ordre d’affichage"
        name="sortOrder"
        type="number"
        defaultValue="0"
        hint="Le plus petit nombre apparaît en premier."
      />
      <input type="hidden" name="isActive" value="true" />

      <AdminFeedback state={state} />
      <AdminSubmit>Créer le tag</AdminSubmit>
    </form>
  );
}

export function TagRow({ tag }: { tag: TagAdmin }) {
  const [editState, editAction] = useActionState<AdminActionState, FormData>(enregistrerTag, {});
  const [deleteState, deleteAction] = useActionState<AdminActionState, FormData>(supprimerTag, {});
  const [confirme, setConfirme] = useState(false);

  return (
    <li className="rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-[color:var(--color-night)]">
            {tag.nom}
          </p>
          <p className="text-[12px] text-[color:var(--color-muted)]">
            {tag.publiees} publiée{tag.publiees > 1 ? 's' : ''}
            {tag.total !== tag.publiees ? ` sur ${tag.total} au total` : ''}
            {tag.image ? ' · visuel' : ''}
          </p>
        </div>
        {!tag.actif ? (
          <span className="shrink-0 rounded-full bg-[color:var(--color-sky)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--color-muted)]">
            Désactivé
          </span>
        ) : null}
      </div>

      <details className="mt-3 border-t border-[color:var(--color-line)] pt-3">
        <summary className="touch-target flex cursor-pointer items-center text-[13px] font-medium text-[color:var(--color-brand)]">
          Modifier
        </summary>

        <form action={editAction} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={tag.id} />
          <AdminField label="Nom" name="name" defaultValue={tag.nom} />
          <AdminField label="Identifiant" name="slug" defaultValue={tag.slug} />
          <ChoixDeGroupe defaultValue={tag.groupe} />
          <AdminTextarea
            label="Description"
            name="description"
            rows={2}
            defaultValue={tag.description ?? ''}
          />
          <AdminField label="Visuel" name="imagePath" defaultValue={tag.image ?? ''} />
          <AdminField
            label="Ordre d’affichage"
            name="sortOrder"
            type="number"
            defaultValue={String(tag.ordre)}
          />

          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={tag.actif}
              className="h-5 w-5 rounded border-[color:var(--color-line)]"
            />
            <span className="text-[13px] text-[color:var(--color-night)]">
              Proposé à l’exploration
            </span>
          </label>

          <AdminFeedback state={editState} />
          <AdminSubmit>Enregistrer</AdminSubmit>
        </form>

        {/* La suppression est le dernier geste de la fiche, derriere un
            deuxieme pas. Desactiver suffit presque toujours : le tag
            disparait de la Bibliotheque et ses associations restent. */}
        <div className="mt-4 border-t border-[color:var(--color-line)] pt-3">
          {!confirme ? (
            <button
              type="button"
              onClick={() => setConfirme(true)}
              className="touch-target flex w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-danger)] text-[13px] font-medium text-[color:var(--color-danger)]"
            >
              Supprimer définitivement
            </button>
          ) : (
            <form action={deleteAction} className="space-y-2">
              <input type="hidden" name="tagId" value={tag.id} />
              <p className="text-[13px] leading-relaxed text-[color:var(--color-night)]">
                {tag.total > 0
                  ? `${tag.total} commande${tag.total > 1 ? 's' : ''} perdront cette étiquette. Aucune commande n’est supprimée.`
                  : 'Ce tag n’est porté par aucune commande.'}{' '}
                La suppression est définitive.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirme(false)}
                  className="touch-target flex items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] text-[13px] font-medium text-[color:var(--color-night)]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="touch-target flex items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-danger)] text-[13px] font-semibold text-white"
                >
                  Supprimer
                </button>
              </div>
            </form>
          )}
          <AdminFeedback state={deleteState} />
        </div>
      </details>
    </li>
  );
}
