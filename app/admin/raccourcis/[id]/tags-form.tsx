'use client';

import { useActionState } from 'react';

import { enregistrerLesTagsDuRaccourci, type AdminActionState } from '@/lib/actions/admin';
import { AdminFeedback, AdminSubmit } from '@/components/ui/admin-form';
import { TAG_GROUPS, TAG_GROUP_LABELS } from '@/lib/constants';
import type { TagAdmin } from '@/lib/admin/tags';

/**
 * Les tags d'une commande, a cocher.
 *
 * C'est le geste qui rend le catalogue trouvable : la Bibliotheque s'explore
 * par les tags, et un tag que personne ne pose n'y apparait pas. Les
 * quatre-vingt-dix-huit du referentiel sont la, groupes ; on ne peut pas en
 * inventer ici, sinon le desordre qu'on vient de corriger reviendrait par la
 * fiche.
 *
 * Des cases et non un champ libre : le formulaire decrit un etat, et
 * l'enregistrement remplace la liste entiere. Rapprocher deux listes
 * laisserait une association derriere a chaque case decochee trop vite.
 */
export function PromptTagsForm({
  promptId,
  tags,
  poses,
}: {
  promptId: string;
  /** Le referentiel entier, tel que l'administration le tient. */
  tags: TagAdmin[];
  /** Ce qui est deja pose, par identifiant. */
  poses: string[];
}) {
  const [state, action] = useActionState<AdminActionState, FormData>(
    enregistrerLesTagsDuRaccourci,
    {},
  );

  const choisis = new Set(poses);
  const actifs = tags.filter((tag) => tag.actif || choisis.has(tag.id));

  if (actifs.length === 0) {
    return (
      <p className="text-[13px] leading-relaxed text-[color:var(--color-muted)]">
        Aucun tag n’est disponible. Créez-en depuis la section Tags.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="promptId" value={promptId} />

      {TAG_GROUPS.map((groupe) => {
        const duGroupe = actifs.filter((tag) => tag.groupe === groupe);
        if (duGroupe.length === 0) return null;

        return (
          <fieldset key={groupe}>
            <legend className="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
              {TAG_GROUP_LABELS[groupe]}
            </legend>
            {/* Des puces qui reviennent a la ligne : quatre-vingt-dix-huit
                cases empilees feraient une page qu'on fait defiler une minute
                avant d'avoir tout vu. */}
            <div className="mt-2 flex flex-wrap gap-2">
              {duGroupe.map((tag) => (
                <label
                  key={tag.id}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[color:var(--color-line)] px-3 text-[13px] text-[color:var(--color-night)] has-[:checked]:border-[color:var(--color-brand)] has-[:checked]:bg-[color:var(--color-brand-soft)] has-[:checked]:font-medium has-[:checked]:text-[color:var(--color-brand-strong)]"
                >
                  <input
                    type="checkbox"
                    name="tagIds"
                    value={tag.id}
                    defaultChecked={choisis.has(tag.id)}
                    className="h-4 w-4 rounded border-[color:var(--color-line)]"
                  />
                  {tag.nom}
                  {!tag.actif ? (
                    <span className="text-[11px] text-[color:var(--color-muted)]">désactivé</span>
                  ) : null}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}

      <AdminFeedback state={state} />
      <AdminSubmit>Enregistrer les tags</AdminSubmit>
    </form>
  );
}
