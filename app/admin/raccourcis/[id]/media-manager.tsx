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
 * Editeur des visuels d'un raccourci.
 *
 * Deux emplacements nommes, jamais un menu de types. Il n'y a que deux images
 * a fournir et chacune a une place a l'ecran : l'image resultat illustre la
 * carte dans la bibliotheque, la paire s'ouvre cote a cote sur la fiche. Un
 * selecteur « Avant / Apres / Miniature / Exemple / Couverture » demandait a
 * l'administrateur de savoir laquelle alimente quoi.
 *
 * Deux apercus montrent le rendu reel avant d'enregistrer : sans eux, il faut
 * quitter l'administration, retrouver la commande dans la bibliotheque, puis
 * revenir corriger un cadrage.
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
  command,
  media,
  requiresPair,
}: {
  promptId: string;
  command: string;
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
  const manquants = [!avant && 'Avant', !apres && 'Résultat'].filter(Boolean);

  return (
    <div className="space-y-4">
      {requiresPair ? (
        <div
          className={`rounded-[color:var(--radius-control)] px-3 py-2.5 text-[length:var(--texte-carte)] leading-relaxed ${
            manquants.length === 0
              ? 'bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]'
              : 'bg-[color:var(--color-member-soft)] text-[color:var(--color-member)]'
          }`}
        >
          {manquants.length === 0
            ? 'Comparaison complète. La carte montre le résultat, la fiche ouvre les deux côte à côte.'
            : `Il manque l’image ${manquants.join(' et ')}. La carte affiche « Visuel à venir » en attendant. Ne jamais réutiliser l’image Avant comme résultat.`}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2">
        <Emplacement
          promptId={promptId}
          kind="before"
          titre="Image avant"
          role="Point de départ. Visible seulement sur la fiche ouverte."
          media={avant}
          onDelete={deleteAction}
        />
        <Emplacement
          promptId={promptId}
          kind="after"
          titre="Image résultat"
          role="C’est elle qui illustre la carte, et la droite de la comparaison."
          media={apres}
          onDelete={deleteAction}
        />
      </div>

      <AdminFeedback state={deleteState} />

      <Apercus command={command} avant={avant} apres={apres} />

      <p className="text-[length:var(--texte-meta)] leading-relaxed text-[color:var(--color-muted)]">
        AVIF ou WebP de préférence, sinon PNG ou JPEG. 10 Mo maximum. Même angle et même cadrage
        pour les deux images. Envoyer une image remplace la précédente.
      </p>
    </div>
  );
}

type VisuelExistant = AdminPromptDetail['media'][number] | null;

/**
 * Un emplacement : ce qu'il contient, ou ce qu'il attend.
 *
 * Vide, il se presente comme une zone a remplir et non comme un formulaire :
 * il n'y a qu'un geste a faire, deposer un fichier. Chaque etat de l'envoi a
 * son message, parce qu'un format refuse, un fichier trop lourd, un depot
 * interrompu et un enregistrement rejete ne se corrigent pas de la meme
 * facon.
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
  const [envoi, setEnvoi] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [, demarrer] = useTransition();

  async function envoyer(file: File) {
    setEtat({});
    setEnvoi(true);

    const ticket = await createMediaTicket({
      promptId,
      kind,
      contentType: file.type,
      size: file.size,
    });

    if ('error' in ticket) {
      setEnvoi(false);
      setEtat({ error: ticket.error });
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.PROMPT_MEDIA)
      .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });

    if (error) {
      setEnvoi(false);
      // Le message brut de Storage est technique ; on dit ce qui est
      // actionnable et on garde la cause dans la console pour le diagnostic.
      console.error('Depot du visuel refuse', error);
      setEtat({ error: 'Le dépôt a échoué. Vérifiez votre connexion et réessayez.' });
      return;
    }

    const formData = new FormData();
    formData.set('promptId', promptId);
    formData.set('kind', kind);
    formData.set('path', ticket.path);
    if (alt.trim()) formData.set('alt', alt.trim());

    const resultat = await registerPromptMedia({}, formData);

    setEnvoi(false);
    setEtat(resultat);
    if (resultat.success) demarrer(() => router.refresh());
  }

  const deposer = (event: React.DragEvent) => {
    event.preventDefault();
    setSurvol(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void envoyer(file);
  };

  return (
    <div className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3">
      <p className="text-[length:var(--texte-carte)] font-bold text-[color:var(--color-night)]">
        {titre}
      </p>
      <p className="mt-0.5 text-[length:var(--texte-meta)] leading-snug text-[color:var(--color-muted)]">
        {role}
      </p>

      <button
        type="button"
        onClick={() => champ.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={deposer}
        disabled={envoi}
        aria-label={media ? `Remplacer ${titre.toLowerCase()}` : `Importer ${titre.toLowerCase()}`}
        className={`relative mt-2.5 block aspect-[4/3] w-full overflow-hidden rounded-[color:var(--radius-control)] border-2 border-dashed transition-colors duration-[var(--duration-fast)] ${
          survol
            ? 'border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)]'
            : 'border-[color:var(--color-line-strong)] bg-[color:var(--color-canvas)]'
        }`}
      >
        {media ? (
          <Image
            src={media.url}
            alt={media.alt ?? ''}
            fill
            sizes="320px"
            className="object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16"
                stroke="var(--color-brand)"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[length:var(--texte-carte)] font-medium text-[color:var(--color-brand)]">
              Importer une image
            </span>
            <span className="text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
              ou glissez-la ici
            </span>
          </span>
        )}

        {envoi ? (
          <span className="absolute inset-0 flex items-center justify-center bg-[color:var(--color-surface)]/88 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-night)]">
            Envoi en cours…
          </span>
        ) : null}
      </button>

      {/* Champ natif masque mais atteignable au clavier via le bouton. */}
      <input
        ref={champ}
        type="file"
        accept="image/avif,image/webp,image/png,image/jpeg"
        className="sr-only"
        onChange={(evenement) => {
          const file = evenement.target.files?.[0];
          // Le champ est remis a zero : rechoisir le meme fichier apres une
          // erreur doit relancer un envoi.
          evenement.target.value = '';
          if (file) void envoyer(file);
        }}
      />

      {media ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="truncate text-[length:var(--texte-meta)] text-[color:var(--color-success)]">
            Image en place
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => champ.current?.click()}
              className="touch-target px-2 text-[length:var(--texte-meta)] font-medium text-[color:var(--color-brand)]"
            >
              Remplacer
            </button>
            <form action={onDelete}>
              <input type="hidden" name="promptId" value={promptId} />
              <input type="hidden" name="mediaId" value={media.id} />
              <button
                type="submit"
                className="touch-target px-2 text-[length:var(--texte-meta)] font-medium text-[color:var(--color-danger)]"
              >
                Supprimer
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <label className="mt-2 block">
        <span className="text-[length:var(--texte-meta)] font-medium text-[color:var(--color-night)]">
          Texte alternatif
        </span>
        <input
          value={alt}
          onChange={(evenement) => setAlt(evenement.target.value)}
          type="text"
          maxLength={200}
          placeholder={kind === 'before' ? 'Ce que montre le départ' : 'Ce que montre le résultat'}
          className="mt-1 h-11 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[length:var(--texte-carte)]"
        />
      </label>

      <div className="mt-2 empty:hidden">
        <AdminFeedback state={etat} />
      </div>
    </div>
  );
}

/**
 * Les deux rendus reels, avant d'enregistrer.
 *
 * La carte ne montre que le resultat, la fiche ouvre la paire : ce sont deux
 * cadrages differents, et une image qui va bien dans l'un peut etre coupee
 * dans l'autre.
 */
function Apercus({
  command,
  avant,
  apres,
}: {
  command: string;
  avant: VisuelExistant;
  apres: VisuelExistant;
}) {
  if (!avant && !apres) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="mb-1.5 text-[length:var(--texte-meta)] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
          Aperçu bibliothèque
        </p>
        <div className="overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)]">
          <div className="relative aspect-[4/3] bg-[color:var(--color-canvas)]">
            {apres ? (
              <Image
                src={apres.url}
                alt=""
                fill
                sizes="200px"
                className="object-cover"
                aria-hidden="true"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
                Visuel à venir
              </span>
            )}
          </div>
          <p className="commande truncate px-2 py-1.5 text-[length:var(--texte-meta)] font-bold text-[color:var(--color-brand)]">
            {command}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[length:var(--texte-meta)] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
          Aperçu de la fiche
        </p>
        <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] p-1">
          {[avant, apres].map((visuel, index) => (
            <div
              key={index}
              className="relative aspect-[4/3] overflow-hidden rounded-[8px] bg-[color:var(--color-canvas)]"
            >
              {visuel ? (
                <Image
                  src={visuel.url}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                  aria-hidden="true"
                />
              ) : null}
              <span className="absolute bottom-0.5 left-0.5 rounded bg-[color:var(--color-surface)]/90 px-1 text-[10px] font-semibold text-[color:var(--color-night)]">
                {index === 0 ? 'Avant' : 'Après'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
