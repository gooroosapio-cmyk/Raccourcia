'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { CONTENT_STATUS, MODES, MODE_LABELS } from '@/lib/constants';
import type { Enums } from '@/lib/supabase/database.types';

const STATUS_LABELS: Record<Enums<'content_status'>, string> = {
  published: 'Publies',
  draft: 'Brouillons',
  archived: 'Archives',
};

/** Filtres de la liste admin. Ils passent par l'URL, comme cote membre. */
export function AdminPromptFilters({
  search,
  mode,
  status,
}: {
  search?: string;
  mode?: Enums<'app_mode'>;
  status?: Enums<'content_status'>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [term, setTerm] = useState(search ?? '');

  const push = (next: URLSearchParams) => {
    next.delete('page');
    startTransition(() =>
      router.replace(`/admin/raccourcis?${next.toString()}`, { scroll: false }),
    );
  };

  useEffect(() => {
    if ((search ?? '') === term) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (term) next.set('q', term);
      else next.delete('q');
      push(next);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const toggle = (key: string, value: string, current?: string) => {
    const next = new URLSearchParams(params.toString());
    if (current === value) next.delete(key);
    else next.set(key, value);
    push(next);
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">Rechercher un raccourci</span>
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Rechercher une commande ou un titre..."
          className="h-11 w-full rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)] px-3 text-[15px] outline-none placeholder:text-[color:var(--color-muted)]"
        />
      </label>

      <div className="-mx-5 overflow-x-auto px-5">
        <div className="flex w-max gap-2">
          {MODES.map((value) => (
            <Chip
              key={value}
              label={MODE_LABELS[value]}
              active={mode === value}
              onClick={() => toggle('mode', value, mode)}
            />
          ))}
          <span aria-hidden="true" className="w-px bg-[color:var(--color-line)]" />
          {CONTENT_STATUS.map((value) => (
            <Chip
              key={value}
              label={STATUS_LABELS[value]}
              active={status === value}
              onClick={() => toggle('statut', value, status)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 shrink-0 whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition-colors duration-[var(--duration-fast)] ${
        active
          ? 'bg-[color:var(--color-brand)] text-white'
          : 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]'
      }`}
    >
      {label}
    </button>
  );
}
