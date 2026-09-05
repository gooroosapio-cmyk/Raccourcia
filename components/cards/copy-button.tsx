'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type CopyState = 'idle' | 'copie' | 'erreur' | 'chargement';

/**
 * Bouton Copier, present directement sur la carte comme dans la fiche
 * (exigence produit). Le libelle affiche la commande courte, mais le
 * presse-papiers recoit le prompt complet (Spec UX/UI, 9).
 *
 * Le payload n'est jamais precharge : il est demande au clic, une seule fois.
 */
export function CopyButton({
  promptId,
  command,
  provider,
  surface,
  locked = false,
  compact = false,
  onLockedClick,
}: {
  promptId: string;
  command: string;
  provider: string;
  surface: 'carte' | 'detail' | 'page-publique';
  locked?: boolean;
  compact?: boolean;
  onLockedClick?: () => void;
}) {
  const [state, setState] = useState<CopyState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const resetLater = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setState('idle');
      setMessage(null);
    }, 1800);
  }, []);

  const copy = useCallback(async () => {
    if (locked) {
      onLockedClick?.();
      return;
    }

    setState('chargement');
    try {
      const response = await fetch('/api/resolve-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId, provider, surface }),
        cache: 'no-store',
      });

      const data = (await response.json()) as { payload?: string; error?: string };
      if (!response.ok || !data.payload) {
        setState('erreur');
        setMessage(data.error ?? 'Impossible de copier. Reessayez.');
        resetLater();
        return;
      }

      await navigator.clipboard.writeText(data.payload);
      setState('copie');
      setMessage('Prompt complet copie. Collez-le dans votre IA.');
      // Micro vibration si le navigateur la permet ; jamais indispensable.
      navigator.vibrate?.(10);
      resetLater();
    } catch {
      setState('erreur');
      setMessage('Impossible de copier. Reessayez.');
      resetLater();
    }
  }, [locked, onLockedClick, promptId, provider, resetLater, surface]);

  const label = locked
    ? 'Debloquer pour copier'
    : state === 'copie'
      ? 'Copie !'
      : state === 'erreur'
        ? 'Reessayer'
        : state === 'chargement'
          ? 'Copie...'
          : `Copier ${command}`;

  const base =
    'touch-target inline-flex items-center justify-center gap-1.5 rounded-[color:var(--radius-control)] font-medium transition-colors duration-[var(--duration-fast)]';
  const size = compact ? 'h-11 w-full px-3 text-[13px]' : 'h-12 w-full px-4 text-[15px]';
  const tone = locked
    ? 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]'
    : state === 'copie'
      ? 'bg-[color:var(--color-success)] text-white'
      : state === 'erreur'
        ? 'bg-[color:var(--color-danger)] text-white'
        : 'bg-[color:var(--color-brand)] text-white hover:bg-[color:var(--color-brand-strong)]';

  return (
    <>
      <button
        type="button"
        onClick={copy}
        disabled={state === 'chargement'}
        aria-label={locked ? 'Debloquer RaccourcIA pour copier ce raccourci' : `Copier ${command}`}
        className={`${base} ${size} ${tone}`}
      >
        {locked ? <LockIcon /> : state === 'copie' ? <CheckIcon /> : <CopyIcon />}
        <span className="truncate">{label}</span>
      </button>
      {/* Le feedback est annonce aux lecteurs d'ecran, pas seulement colore. */}
      <span role="status" aria-live="polite" className="sr-only">
        {message}
      </span>
    </>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 15V5a2 2 0 0 1 2-2h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 13 4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
