'use client';

import { useFormStatus } from 'react-dom';

/** Bouton de formulaire avec etat de soumission visible. */
export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] text-base font-medium text-white transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--color-brand-strong)] disabled:opacity-60"
    >
      {pending ? 'Un instant...' : children}
    </button>
  );
}

/** Message d'erreur sous le formulaire, annonce aux lecteurs d'ecran. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-[color:var(--radius-control)] bg-[#FEF2F2] px-3 py-2 text-[13px] leading-relaxed text-[color:var(--color-danger)]"
    >
      {message}
    </p>
  );
}

/** Message positif sous le formulaire : issue favorable qui n'est pas une erreur. */
export function FormNotice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="rounded-[color:var(--radius-control)] bg-[#F0FDF4] px-3 py-2 text-[13px] leading-relaxed text-[color:var(--color-success)]"
    >
      {message}
    </p>
  );
}

/** Champ de formulaire : label visible, erreur sous le champ (Spec UX/UI, 18). */
export function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  placeholder,
  hint,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-[color:var(--color-night)]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px] outline-none focus:border-[color:var(--color-brand)]"
      />
      {hint ? (
        <span className="mt-1 block text-[12px] text-[color:var(--color-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}
