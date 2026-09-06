'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/toast';

type Etat = 'repos' | 'chargement' | 'copie';

/**
 * Bouton de copie d'une commande.
 *
 * L'interface parle de commande, jamais de prompt : le contenu complet n'est
 * ni affiche, ni precharge, ni nomme. Il est demande au clic a une route qui
 * revalide les droits, puis pose directement dans le presse-papiers.
 *
 * Le message de retour est "Commande copiee" : ce que l'utilisateur vient
 * d'obtenir est une commande prete a coller, la mecanique interne ne le
 * regarde pas.
 */
export function CopyCommandButton({
  promptId,
  provider,
  surface,
  locked = false,
  compact = false,
  onLockedClick,
}: {
  promptId: string;
  provider: string;
  surface: 'carte' | 'detail' | 'page-publique';
  locked?: boolean;
  /** Variante des cartes : le libelle se reduit a "Copier". */
  compact?: boolean;
  onLockedClick?: () => void;
}) {
  const { show } = useToast();
  const [etat, setEtat] = useState<Etat>('repos');

  const copier = useCallback(async () => {
    if (locked) {
      onLockedClick?.();
      return;
    }

    setEtat('chargement');
    try {
      const response = await fetch('/api/resolve-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId, provider, surface }),
        cache: 'no-store',
      });

      const data = (await response.json()) as { payload?: string; error?: string };
      if (!response.ok || !data.payload) {
        setEtat('repos');
        show(data.error ?? 'Copie impossible. Reessayez.', 'erreur');
        return;
      }

      await navigator.clipboard.writeText(data.payload);
      setEtat('copie');
      show('Commande copiee');
      navigator.vibrate?.(10);
      // La coche est une confirmation breve : le bouton doit redevenir
      // utilisable tout de suite, on copie souvent deux fois de suite.
      setTimeout(() => setEtat('repos'), 1400);
    } catch {
      setEtat('repos');
      show('Copie impossible. Reessayez.', 'erreur');
    }
  }, [locked, onLockedClick, promptId, provider, show, surface]);

  const libelle = locked
    ? compact
      ? 'Debloquer'
      : 'Debloquer pour copier'
    : etat === 'copie'
      ? 'Copie'
      : compact
        ? 'Copier'
        : 'Copier la commande';

  const ton = locked
    ? 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]'
    : etat === 'copie'
      ? 'bg-[color:var(--color-success)] text-white'
      : 'bg-[color:var(--color-brand)] text-white hover:bg-[color:var(--color-brand-strong)]';

  return (
    <button
      type="button"
      onClick={copier}
      // Jamais desactive pendant le chargement : la largeur resterait la meme
      // mais le bouton paraitrait casse. On garde l'etat visible a la place.
      aria-busy={etat === 'chargement'}
      aria-label={locked ? 'Debloquer RaccourcIA pour copier cette commande' : 'Copier la commande'}
      className={`touch-target inline-flex w-full items-center justify-center gap-1.5 rounded-[color:var(--radius-control)] font-semibold transition-[background-color,transform] duration-[var(--duration-fast)] active:scale-[0.98] ${
        compact ? 'h-11 px-3 text-[13px]' : 'h-13 px-4 text-[15px]'
      } ${ton}`}
    >
      {locked ? <LockIcon /> : etat === 'copie' ? <CheckIcon /> : <CopyIcon />}
      <span className="truncate">{libelle}</span>
    </button>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="2" />
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
      <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
