'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type Ton = 'succes' | 'erreur';
type Message = { id: number; texte: string; ton: Ton };

/** Duree d'affichage : assez pour lire, trop court pour gener. */
const DUREE_MS = 2200;

const ToastContext = createContext<{ show: (texte: string, ton?: Ton) => void }>({
  show: () => {},
});

/** Affiche un message court depuis n'importe quel composant client. */
export function useToast() {
  return useContext(ToastContext);
}

/**
 * Couche de messages courts.
 *
 * Un seul message a la fois : deux toasts empiles se recouvrent sur un
 * telephone et aucun des deux ne se lit. Le dernier remplace le precedent,
 * c'est toujours lui qui correspond au geste que l'utilisateur vient de faire.
 *
 * Le message est annonce aux lecteurs d'ecran par une region live, jamais
 * par la seule couleur du fond.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<Message | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    },
    [],
  );

  const show = useCallback((texte: string, ton: Ton = 'succes') => {
    if (minuteur.current) clearTimeout(minuteur.current);
    setMessage({ id: Date.now(), texte, ton });
    minuteur.current = setTimeout(() => setMessage(null), DUREE_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-5"
      >
        {message ? (
          <div
            key={message.id}
            className={`anim-toast flex max-w-screen-sm items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-medium text-white shadow-[var(--shadow-raised)] ${
              message.ton === 'succes'
                ? 'bg-[color:var(--color-night)]'
                : 'bg-[color:var(--color-danger)]'
            }`}
          >
            {message.ton === 'succes' ? <CheckIcon /> : <AlertIcon />}
            <span>{message.texte}</span>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 13 4 4L19 7"
        stroke="var(--color-success)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7.5v5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1.1" fill="currentColor" />
    </svg>
  );
}
