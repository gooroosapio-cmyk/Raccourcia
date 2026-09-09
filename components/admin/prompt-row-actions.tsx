'use client';

import { useActionState } from 'react';

import { setPromptFree, setPromptPinned, setPromptStatus } from '@/lib/actions/admin';
import type { AdminActionState } from '@/lib/actions/admin';

/**
 * Les trois gestes qu'on fait sans ouvrir la fiche : offrir, remonter,
 * masquer.
 *
 * Ils vivent dans la liste parce que c'est la qu'on les decide — en
 * parcourant le catalogue, pas en editant un raccourci. Ouvrir la fiche pour
 * masquer une commande fait perdre sa place dans une liste de 565.
 *
 * Ce sont des formulaires et non des boutons pilotes en JavaScript : le
 * serveur revalide le role a chaque appel, et la fonction Postgres refuse
 * l'ecriture a un compte sans role. Rien de ce qui est ici ne fait autorite.
 */
export function PromptRowActions({
  promptId,
  free,
  pinned,
  status,
}: {
  promptId: string;
  free: boolean;
  pinned: boolean;
  status: 'draft' | 'published' | 'archived';
}) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <Offert promptId={promptId} free={free} />
      <Etoile promptId={promptId} pinned={pinned} />
      <Masquer promptId={promptId} status={status} />
    </span>
  );
}

/**
 * L'etiquette du palier d'essai.
 *
 * Un raccourci offert se copie sans compte : c'est la seule chose que le
 * produit montre avant d'etre achete. Le geste se fait ici parce que le
 * choix se fait en comparant les cartes, pas en lisant une fiche.
 */
function Offert({ promptId, free }: { promptId: string; free: boolean }) {
  const [etat, action, enCours] = useActionState<AdminActionState, FormData>(setPromptFree, {});

  return (
    <form action={action}>
      <input type="hidden" name="promptId" value={promptId} />
      <input type="hidden" name="free" value={String(!free)} />
      <button
        type="submit"
        disabled={enCours}
        aria-pressed={free}
        title={etat.error ?? (free ? 'Remettre derriere l’accès' : 'Offrir ce raccourci')}
        aria-label={free ? 'Retirer ce raccourci des commandes offertes' : 'Offrir ce raccourci'}
        className={`touch-target flex items-center justify-center rounded-[color:var(--radius-control)] transition-colors duration-[var(--duration-fast)] ${
          free
            ? 'text-[color:var(--color-success)]'
            : 'text-[color:var(--color-line-strong)] active:text-[color:var(--color-muted)]'
        } ${enCours ? 'opacity-50' : ''}`}
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill={free ? 'currentColor' : 'none'}
          aria-hidden="true"
        >
          <path
            d="M3.5 11.4V4.8a1.3 1.3 0 0 1 1.3-1.3h6.6c.35 0 .68.14.92.38l8 8a1.3 1.3 0 0 1 0 1.84l-6.6 6.6a1.3 1.3 0 0 1-1.84 0l-8-8a1.3 1.3 0 0 1-.38-.92Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="8" cy="8" r="1.5" fill={free ? 'var(--color-surface)' : 'currentColor'} />
        </svg>
      </button>
    </form>
  );
}

/**
 * L'etoile de mise en tete.
 *
 * Invisible cote membre : aucune carte ne porte de marque, seul l'ordre du
 * catalogue en garde la trace. C'est ce qui la distingue d'un badge.
 */
function Etoile({ promptId, pinned }: { promptId: string; pinned: boolean }) {
  const [etat, action, enCours] = useActionState<AdminActionState, FormData>(setPromptPinned, {});

  return (
    <form action={action}>
      <input type="hidden" name="promptId" value={promptId} />
      <input type="hidden" name="pinned" value={String(!pinned)} />
      <button
        type="submit"
        disabled={enCours}
        aria-pressed={pinned}
        title={etat.error ?? (pinned ? 'Retirer de la tête' : 'Remonter en tête')}
        aria-label={
          pinned ? 'Retirer de la tête de la catégorie' : 'Remonter en tête de la catégorie'
        }
        className={`touch-target flex items-center justify-center rounded-[color:var(--radius-control)] transition-colors duration-[var(--duration-fast)] ${
          pinned
            ? 'text-[color:var(--color-member)]'
            : 'text-[color:var(--color-line-strong)] active:text-[color:var(--color-muted)]'
        } ${enCours ? 'opacity-50' : ''}`}
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill={pinned ? 'currentColor' : 'none'}
          aria-hidden="true"
        >
          <path
            d="m12 3.5 2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 16.95 6.75 19.7l1-5.85L3.5 9.7l5.9-.9z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}

/**
 * Masquer, ou remettre en ligne.
 *
 * `draft` et non `archived` : le raccourci disparait tout de suite du
 * catalogue et revient d'un clic. L'archive existe aussi, mais elle dit
 * « retire du catalogue », pas « je verrai plus tard ».
 */
function Masquer({
  promptId,
  status,
}: {
  promptId: string;
  status: 'draft' | 'published' | 'archived';
}) {
  const [etat, action, enCours] = useActionState<AdminActionState, FormData>(setPromptStatus, {});
  const enLigne = status === 'published';

  return (
    <form action={action}>
      <input type="hidden" name="promptId" value={promptId} />
      <input type="hidden" name="status" value={enLigne ? 'draft' : 'published'} />
      <button
        type="submit"
        disabled={enCours}
        title={etat.error ?? (enLigne ? 'Masquer immédiatement' : 'Remettre en ligne')}
        aria-label={enLigne ? 'Masquer ce raccourci' : 'Remettre ce raccourci en ligne'}
        className={`touch-target flex items-center justify-center rounded-[color:var(--radius-control)] transition-colors duration-[var(--duration-fast)] ${
          enLigne
            ? 'text-[color:var(--color-line-strong)] active:text-[color:var(--color-danger)]'
            : 'text-[color:var(--color-success)]'
        } ${enCours ? 'opacity-50' : ''}`}
      >
        {enLigne ? <OeilBarre /> : <Oeil />}
      </button>
    </form>
  );
}

function Oeil() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function OeilBarre() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.9 5.8A9.9 9.9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.5M6.2 7.7A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5c1.4 0 2.6-.3 3.7-.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
