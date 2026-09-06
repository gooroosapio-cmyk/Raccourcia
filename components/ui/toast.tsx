'use client';

import { useEffect, useState } from 'react';

type Ton = 'succes' | 'erreur';
type Message = { id: number; texte: string; ton: Ton };

/** Duree d'affichage : assez pour lire, trop court pour gener. */
const DUREE_MS = 2200;

/**
 * Le message vit dans un module, pas dans un contexte React.
 *
 * Un fournisseur de contexte devrait envelopper l'arbre entier de l'espace
 * membre. Cette enveloppe cliente fait envoyer la coquille avant que les
 * pages aient fini de rendre, et un `redirect()` de page devient alors une
 * redirection cliente au lieu d'un 307 : la garde des espaces reserves ne
 * tient plus sans JavaScript.
 *
 * Un emetteur de module donne la meme ergonomie sans rien envelopper : le
 * `Toaster` est une feuille, pose a cote du contenu.
 */
let courant: Message | null = null;
const abonnes = new Set<(message: Message | null) => void>();

function publier(message: Message | null) {
  courant = message;
  for (const abonne of abonnes) abonne(message);
}

/**
 * Affiche un message court. Un seul a la fois : deux toasts empiles se
 * recouvrent sur un telephone et aucun des deux ne se lit. Le dernier
 * remplace le precedent, c'est toujours lui qui correspond au geste que
 * l'utilisateur vient de faire.
 */
export function showToast(texte: string, ton: Ton = 'succes') {
  publier({ id: Date.now(), texte, ton });
}

/** Conserve l'ergonomie d'un hook pour les composants qui l'utilisaient. */
export function useToast() {
  return { show: showToast };
}

/**
 * Couche d'affichage des messages.
 *
 * Le message est annonce aux lecteurs d'ecran par une region live, jamais par
 * la seule couleur du fond.
 */
export function Toaster() {
  const [message, setMessage] = useState<Message | null>(courant);

  useEffect(() => {
    abonnes.add(setMessage);
    return () => {
      abonnes.delete(setMessage);
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const minuteur = setTimeout(() => publier(null), DUREE_MS);
    return () => clearTimeout(minuteur);
  }, [message]);

  return (
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
