'use client';

import Image from 'next/image';
import { useActionState } from 'react';

import { deletePromptMedia, uploadPromptMedia, type AdminActionState } from '@/lib/actions/admin';
import { AdminFeedback, AdminSubmit } from '@/components/ui/admin-form';
import { MEDIA_KINDS } from '@/lib/constants';
import type { AdminPromptDetail } from '@/lib/admin/queries';
import type { Enums } from '@/lib/supabase/database.types';

const KIND_LABELS: Record<Enums<'media_kind'>, string> = {
  thumbnail: 'Miniature',
  before: 'Avant',
  after: 'Apres',
  example: 'Exemple',
  cover: 'Couverture',
};

/**
 * Envoi et retrait des visuels, depuis le telephone.
 *
 * `capture` n'est pas force : l'admin choisit sa galerie ou son appareil photo.
 */
export function PromptMediaManager({
  promptId,
  media,
}: {
  promptId: string;
  media: AdminPromptDetail['media'];
}) {
  const [uploadState, uploadAction] = useActionState<AdminActionState, FormData>(
    uploadPromptMedia,
    {},
  );
  const [deleteState, deleteAction] = useActionState<AdminActionState, FormData>(
    deletePromptMedia,
    {},
  );

  return (
    <div className="space-y-4">
      {media.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3">
          {media.map((item) => (
            <li
              key={item.id}
              className="overflow-hidden rounded-[color:var(--radius-control)] border border-[color:var(--color-line)]"
            >
              <div className="relative aspect-[4/3] bg-[color:var(--color-canvas)]">
                <Image
                  src={item.url}
                  alt={item.alt ?? ''}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="text-[12px] text-[color:var(--color-muted)]">
                  {KIND_LABELS[item.kind]}
                </span>
                <form action={deleteAction}>
                  <input type="hidden" name="promptId" value={promptId} />
                  <input type="hidden" name="mediaId" value={item.id} />
                  <button
                    type="submit"
                    className="touch-target px-2 text-[12px] font-medium text-[color:var(--color-danger)]"
                  >
                    Retirer
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-[color:var(--color-muted)]">
          Aucun visuel. La carte affiche une vignette typographique en attendant.
        </p>
      )}

      <AdminFeedback state={deleteState} />

      <form
        action={uploadAction}
        className="space-y-3 border-t border-[color:var(--color-line)] pt-4"
      >
        <input type="hidden" name="promptId" value={promptId} />

        <label className="block">
          <span className="text-[13px] font-medium text-[color:var(--color-night)]">Type</span>
          <select
            name="kind"
            defaultValue="thumbnail"
            className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px]"
          >
            {MEDIA_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-[color:var(--color-night)]">Image</span>
          <input
            type="file"
            name="file"
            accept="image/webp,image/avif,image/png,image/jpeg"
            required
            className="mt-1 block w-full text-[13px] text-[color:var(--color-muted)] file:mr-3 file:h-11 file:rounded-[color:var(--radius-control)] file:border-0 file:bg-[color:var(--color-sky)] file:px-3 file:text-[13px] file:font-medium file:text-[color:var(--color-night)]"
          />
          <span className="mt-1 block text-[12px] text-[color:var(--color-muted)]">
            WebP, AVIF, PNG ou JPEG. 10 Mo maximum.
          </span>
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-[color:var(--color-night)]">
            Texte alternatif
          </span>
          <input
            name="alt"
            className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px]"
          />
          <span className="mt-1 block text-[12px] text-[color:var(--color-muted)]">
            Decrit l image pour les lecteurs d ecran.
          </span>
        </label>

        <AdminFeedback state={uploadState} />
        <AdminSubmit tone="secondaire">Ajouter le visuel</AdminSubmit>
      </form>
    </div>
  );
}
