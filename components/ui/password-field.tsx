'use client';

import { useRef, useState } from 'react';

/**
 * Champ de mot de passe avec bascule Afficher / Masquer.
 *
 * Sur un clavier tactile, un mot de passe se saisit a l'aveugle : la moitie
 * des echecs de connexion vient d'une faute qu'on ne peut pas relire. Pouvoir
 * verifier ce qu'on a tape evite un cycle complet d'erreur puis de
 * ressaisie.
 *
 * La bascule ne touche qu'au `type` : la valeur n'est jamais reecrite, sinon
 * le gestionnaire de mots de passe du navigateur perdrait le fil et la
 * position du curseur sauterait a la fin du champ.
 */
export function PasswordField({
  label,
  name,
  autoComplete = 'current-password',
  hint,
  required = true,
}: {
  label: string;
  name: string;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const champ = useRef<HTMLInputElement>(null);

  const basculer = () => {
    const element = champ.current;
    // La position du curseur est relevee avant le changement de type : le
    // navigateur la remet a la fin quand un champ passe de password a text.
    const debut = element?.selectionStart ?? null;
    const fin = element?.selectionEnd ?? null;

    setVisible((etat) => !etat);

    requestAnimationFrame(() => {
      if (!element || debut === null || fin === null) return;
      element.focus();
      try {
        element.setSelectionRange(debut, fin);
      } catch {
        // Certains navigateurs refusent la selection sur un champ password :
        // le focus seul suffit alors, la saisie n'est pas perdue.
      }
    });
  };

  return (
    <div className="block">
      <label
        htmlFor={`champ-${name}`}
        className="text-[length:var(--texte-carte)] font-medium text-[color:var(--color-night)]"
      >
        {label}
      </label>

      <div className="relative mt-1">
        <input
          ref={champ}
          id={`champ-${name}`}
          name={name}
          type={visible ? 'text' : 'password'}
          required={required}
          autoComplete={autoComplete}
          className="h-[50px] w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] pl-3.5 pr-12 text-[16px] outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] focus:border-[color:var(--color-brand)] focus:shadow-[0_0_0_3px_var(--color-brand-soft)]"
        />

        <button
          type="button"
          onClick={basculer}
          aria-pressed={visible}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="touch-target absolute right-0 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-[color:var(--radius-control)] text-[color:var(--color-muted)]"
        >
          {visible ? <OeilBarre /> : <Oeil />}
        </button>
      </div>

      {hint ? (
        <p className="mt-1 text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Oeil() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function OeilBarre() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 4.5 20 19.5M9.6 9.7A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2M6.2 6.9C3.9 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.5 4.2-1.1M17.6 15.3c2.3-1.6 3.9-3.3 3.9-3.3S18 5.5 12 5.5c-.8 0-1.6.1-2.3.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
