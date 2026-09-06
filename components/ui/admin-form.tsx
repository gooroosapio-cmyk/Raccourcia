'use client';

import { useFormStatus } from 'react-dom';

import type { AdminActionState } from '@/lib/actions/admin';

/** Champs du back-office : labels visibles, cibles tactiles confortables. */

export function AdminField({
  label,
  name,
  defaultValue,
  hint,
  type = 'text',
  required = true,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-[color:var(--color-night)]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px] outline-none focus:border-[color:var(--color-brand)]"
      />
      {hint ? (
        <span className="mt-1 block text-[12px] text-[color:var(--color-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

export function AdminTextarea({
  label,
  name,
  defaultValue,
  hint,
  rows = 3,
  required = false,
  mono = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
  rows?: number;
  required?: boolean;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-[color:var(--color-night)]">{label}</span>
      <textarea
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        className={`mt-1 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2 text-[15px] leading-relaxed outline-none focus:border-[color:var(--color-brand)] ${
          mono ? 'font-mono text-[13px]' : ''
        }`}
      />
      {hint ? (
        <span className="mt-1 block text-[12px] text-[color:var(--color-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

export function AdminToggle({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 py-1">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--color-brand)]"
      />
      <span className="min-w-0">
        <span className="block text-[14px] text-[color:var(--color-ink)]">{label}</span>
        {hint ? (
          <span className="block text-[12px] leading-snug text-[color:var(--color-muted)]">
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function AdminSubmit({
  children,
  tone = 'primaire',
}: {
  children: React.ReactNode;
  tone?: 'primaire' | 'secondaire' | 'danger';
}) {
  const { pending } = useFormStatus();

  const tones = {
    primaire: 'bg-[color:var(--color-brand)] text-white',
    secondaire:
      'border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-night)]',
    danger: 'bg-[color:var(--color-danger)] text-white',
  } as const;

  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] text-[15px] font-medium disabled:opacity-60 ${tones[tone]}`}
    >
      {pending ? 'Un instant...' : children}
    </button>
  );
}

/** Retour d'action : chaque geste recoit une reponse visible. */
export function AdminFeedback({ state }: { state: AdminActionState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-[color:var(--radius-control)] bg-[#FEF2F2] px-3 py-2 text-[13px] leading-relaxed text-[color:var(--color-danger)]"
      >
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-[color:var(--radius-control)] bg-[#E9F7EF] px-3 py-2 text-[13px] leading-relaxed text-[color:var(--color-success)]"
      >
        {state.success}
      </p>
    );
  }
  return null;
}

/**
 * Choix multiple parmi une liste fermee.
 *
 * Les entrees et les formats de sortie ne se saisissent pas librement :
 * l'interface publique associe une icone et un libelle a chaque valeur, qu'un
 * texte tape a la main rendrait impossible a retrouver.
 */
export function AdminCheckboxGroup({
  legend,
  name,
  options,
  selected,
  hint,
}: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  selected: string[];
  hint?: string;
}) {
  return (
    <fieldset>
      <legend className="text-[13px] font-medium text-[color:var(--color-night)]">{legend}</legend>
      {hint ? (
        <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--color-muted)]">{hint}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="touch-target inline-flex cursor-pointer items-center gap-2 rounded-full border border-[color:var(--color-line)] px-3 text-[13px] text-[color:var(--color-night)] has-[:checked]:border-[color:var(--color-brand)] has-[:checked]:bg-[color:var(--color-sky)]"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selected.includes(option.value)}
              className="h-4 w-4 accent-[color:var(--color-brand)]"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
