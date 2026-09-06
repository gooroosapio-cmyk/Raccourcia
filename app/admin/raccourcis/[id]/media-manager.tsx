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
 * La carte image repose sur une paire Avant/Apres. Le bloc en tete dit
 * lequel des deux manque : sans lui, l'administrateur envoie un visuel, voit
 * la carte inchangee et croit a une panne.
 *
 * `capture` n'est pas force : l'admin choisit sa galerie ou son appareil photo.
 */
export function PromptMediaManager({
  promptId,
  media,
  requiresPair,
}: {
  promptId: string;
  media: AdminPromptDetail['media'];
  /** Vrai pour une commande a carte visuelle : la paire y est exigee. */
  requiresPair: boolean;
}) {
  const [uploadState, uploadAction] = useActionState<AdminActionState, FormData>(
    uploadPromptMedia,
    {},
  );
  const [deleteState, deleteAction] = useActionState<AdminActionState, FormData>(
    deletePromptMedia,
    {},
  );

  const avant = media.find((item) => item.kind === 'before');
  const apres = media.find((item) => item.kind === 'after');
  const manquants = [!avant && 'Avant', !apres && 'Apres'].filter(Boolean);

  return (
    <div className="space-y-4">
      {requiresPair ? (
        <div
          className={`rounded-[color:var(--radius-control)] px-3 py-2.5 text-[13px] leading-relaxed ${
            manquants.length === 0
              ? 'bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]'
              : 'bg-[color:var(--color-member-soft)] text-[color:var(--color-member)]'
          }`}
        >
          {manquants.length === 0
            ? 'Comparaison complete : la carte affiche le vrai avant / apres.'
            : `Fiche incomplete : il manque le visuel ${manquants.join(' et ')}. La carte affiche une vignette typographique en attendant. Ne jamais reutiliser l image Avant comme resultat.`}
        </div>
      ) : null}

      {media.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3">
          {media.map((item) => (
            <li
              key={item.id}
              className="overflow-hidden rounded-[color:var(--radius-control)] border border-[color:var(--color-line)]"
            >
              <div className="relative aspect-[16/10] bg-[color:var(--color-canvas)]">
                <Image
                  src={item.url}
                  alt={item.alt ?? ''}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              </div>
              <div className="p-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[12px] font-medium text-[color:var(--color-night)]">
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
                {/* Le texte alternatif est verifiable d'un coup d'oeil : deux
                    images identiques trahissent une paire mal renseignee. */}
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[color:var(--color-muted)]">
                  {item.alt ?? 'Aucun texte alternatif'}
                </p>
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
            // On propose d'abord ce qui manque : c'est presque toujours ce que
            // l'administrateur vient envoyer.
            defaultValue={!avant ? 'before' : !apres ? 'after' : 'thumbnail'}
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
            WebP ou AVIF de preference, sinon PNG ou JPEG. 10 Mo maximum. Cadrage 16:10, meme angle
            pour l Avant et l Apres.
          </span>
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-[color:var(--color-night)]">
            Texte alternatif
          </span>
          <input
            name="alt"
            type="text"
            maxLength={200}
            className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px]"
          />
          <span className="mt-1 block text-[12px] text-[color:var(--color-muted)]">
            Decrit ce que montre l image. Distinct pour l Avant et pour l Apres.
          </span>
        </label>

        <AdminFeedback state={uploadState} />
        <AdminSubmit tone="secondaire">Envoyer le visuel</AdminSubmit>
      </form>
    </div>
  );
}
