'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useActionState, useRef, useState, useTransition } from 'react';

import {
  createMediaTicket,
  deletePromptMedia,
  registerPromptMedia,
  type AdminActionState,
} from '@/lib/actions/admin';
import { AdminFeedback } from '@/components/ui/admin-form';
import { createClient } from '@/lib/supabase/client';
import { STORAGE_BUCKETS } from '@/lib/constants';
import type { AdminPromptDetail } from '@/lib/admin/queries';

/**
 * Les visuels d'un raccourci, en deux emplacements nommes.
 *
 * Un menu deroulant listant cinq types demandait a l'administrateur de savoir
 * lequel alimente quoi. Il n'y a que deux images a fournir, et chacune a une
 * place a l'ecran : l'Apres illustre la carte dans la bibliotheque, la paire
 * s'ouvre cote a cote sur la fiche. Les emplacements le disent.
 *
 * Le fichier ne passe pas par le serveur. Une action serveur plafonne le
 * corps de la requete a 1 Mo et l'hebergeur a quelques megaoctets : une photo
 * de telephone depassait les deux, et l'envoi echouait sur la page d'erreur
 * globale sans jamais dire pourquoi. Le navigateur depose donc directement
 * dans le bucket, avec une autorisation a usage unique delivree par le
 * serveur, qui seul verifie que l'appelant est administrateur.
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
  const [deleteState, deleteAction] = useActionState<AdminActionState, FormData>(
    deletePromptMedia,
    {},
  );

  const avant = media.find((item) => item.kind === 'before') ?? null;
  const apres = media.find((item) => item.kind === 'after') ?? null;
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
            ? 'Comparaison complete. La carte montre l Apres, la fiche ouvre les deux cote a cote.'
            : `Il manque le visuel ${manquants.join(' et ')}. La carte affiche une vignette typographique en attendant. Ne jamais reutiliser l image Avant comme resultat.`}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Emplacement
          promptId={promptId}
          kind="before"
          titre="Avant"
          role="Point de depart. Visible seulement sur la fiche ouverte."
          media={avant}
          onDelete={deleteAction}
        />
        <Emplacement
          promptId={promptId}
          kind="after"
          titre="Apres"
          role="Resultat. C est cette image qui illustre la carte."
          media={apres}
          onDelete={deleteAction}
        />
      </div>

      <AdminFeedback state={deleteState} />

      <p className="text-[12px] leading-relaxed text-[color:var(--color-muted)]">
        WebP ou AVIF de preference, sinon PNG ou JPEG. 10 Mo maximum. Cadrage 16:10, meme angle pour
        l Avant et l Apres. Renvoyer une image remplace la precedente.
      </p>
    </div>
  );
}

type VisuelExistant = AdminPromptDetail['media'][number] | null;

/**
 * Un emplacement : ce qu'il contient, ou ce qu'il attend.
 *
 * Vide, il se presente comme une zone a remplir plutot que comme un
 * formulaire : il n'y a qu'un geste a faire, choisir un fichier.
 */
function Emplacement({
  promptId,
  kind,
  titre,
  role,
  media,
  onDelete,
}: {
  promptId: string;
  kind: 'before' | 'after';
  titre: string;
  role: string;
  media: VisuelExistant;
  onDelete: (formData: FormData) => void;
}) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState(media?.alt ?? '');
  const [etat, setEtat] = useState<AdminActionState>({});
  const [progression, setProgression] = useState<number | null>(null);
  const [, demarrer] = useTransition();

  async function envoyer(file: File) {
    setEtat({});
    setProgression(0);

    const ticket = await createMediaTicket({
      promptId,
      kind,
      contentType: file.type,
      size: file.size,
    });

    if ('error' in ticket) {
      setProgression(null);
      setEtat({ error: ticket.error });
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.PROMPT_MEDIA)
      .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });

    if (error) {
      setProgression(null);
      // Le message brut de Storage est technique ; on dit ce qui est
      // actionnable et on garde la cause dans la console pour le diagnostic.
      console.error('Depot du visuel refuse', error);
      setEtat({ error: 'Le depot a echoue. Verifiez votre connexion et reessayez.' });
      return;
    }

    setProgression(100);

    const formData = new FormData();
    formData.set('promptId', promptId);
    formData.set('kind', kind);
    formData.set('path', ticket.path);
    if (alt.trim()) formData.set('alt', alt.trim());

    const resultat = await registerPromptMedia({}, formData);

    setProgression(null);
    setEtat(resultat);
    if (resultat.success) demarrer(() => router.refresh());
  }

  return (
    <div className="rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3">
      <p className="text-[14px] font-semibold text-[color:var(--color-night)]">{titre}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-[color:var(--color-muted)]">{role}</p>

      <div className="relative mt-2.5 aspect-[16/10] overflow-hidden rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)]">
        {media ? (
          <Image
            src={media.url}
            alt={media.alt ?? ''}
            fill
            sizes="320px"
            className="object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[13px] text-[color:var(--color-muted)]">
            Aucune image
          </span>
        )}

        {progression !== null ? (
          <span className="absolute inset-0 flex items-center justify-center bg-white/85 text-[13px] font-medium text-[color:var(--color-night)]">
            Envoi en cours...
          </span>
        ) : null}
      </div>

      <input
        ref={champ}
        type="file"
        accept="image/webp,image/avif,image/png,image/jpeg"
        className="sr-only"
        onChange={(evenement) => {
          const file = evenement.target.files?.[0];
          // Le champ est remis a zero : rechoisir le meme fichier apres une
          // erreur doit relancer un envoi.
          evenement.target.value = '';
          if (file) void envoyer(file);
        }}
      />

      <button
        type="button"
        onClick={() => champ.current?.click()}
        disabled={progression !== null}
        className="touch-target mt-2.5 flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] text-[15px] font-medium text-white disabled:opacity-60"
      >
        {media ? `Remplacer l ${titre}` : `Choisir l image ${titre}`}
      </button>

      <label className="mt-2.5 block">
        <span className="text-[12px] font-medium text-[color:var(--color-night)]">
          Texte alternatif
        </span>
        <input
          value={alt}
          onChange={(evenement) => setAlt(evenement.target.value)}
          type="text"
          maxLength={200}
          placeholder={titre === 'Avant' ? 'Ce que montre le depart' : 'Ce que montre le resultat'}
          className="mt-1 h-11 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[14px]"
        />
      </label>

      <div className="mt-2 min-h-[1px]">
        <AdminFeedback state={etat} />
      </div>

      {media ? (
        <form action={onDelete} className="mt-2">
          <input type="hidden" name="promptId" value={promptId} />
          <input type="hidden" name="mediaId" value={media.id} />
          <button
            type="submit"
            className="touch-target w-full text-[12px] font-medium text-[color:var(--color-danger)]"
          >
            Retirer
          </button>
        </form>
      ) : null}
    </div>
  );
}
