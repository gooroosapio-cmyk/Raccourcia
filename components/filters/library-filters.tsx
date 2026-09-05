'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { MODE_LABELS, type Mode } from '@/lib/constants';
import type { CategoryNode } from '@/lib/catalog/types';

/**
 * Recherche, switch de mode et chips de categories.
 *
 * Les filtres passent par l'URL : la position est partageable, le retour
 * arriere fonctionne, et fermer un detail ne perd rien.
 */
export function LibraryFilters({
  modes,
  mode,
  categories,
  categorySlug,
  search,
}: {
  modes: readonly Mode[];
  mode: Mode;
  categories: CategoryNode[];
  categorySlug?: string;
  search?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [term, setTerm] = useState(search ?? '');

  const push = useCallback(
    (next: URLSearchParams) => {
      startTransition(() => {
        router.replace(`/app?${next.toString()}`, { scroll: false });
      });
    },
    [router],
  );

  // Recherche differee : les resultats se mettent a jour sans ecran
  // intermediaire, mais on n'interroge pas la base a chaque frappe.
  useEffect(() => {
    if ((search ?? '') === term) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (term) next.set('q', term);
      else next.delete('q');
      next.delete('categorie');
      push(next);
    }, 250);
    return () => clearTimeout(timer);
  }, [params, push, search, term]);

  const selectMode = (value: Mode) => {
    const next = new URLSearchParams(params.toString());
    next.set('mode', value);
    // Changer de mode reinitialise les categories, qui lui sont propres.
    next.delete('categorie');
    push(next);
  };

  const selectCategory = (slug?: string) => {
    const next = new URLSearchParams(params.toString());
    if (slug) next.set('categorie', slug);
    else next.delete('categorie');
    push(next);
  };

  const chips = categories.flatMap((parent) => [
    { slug: parent.slug, name: parent.name },
    ...parent.children.map((child) => ({ slug: child.slug, name: child.name })),
  ]);

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">Rechercher un raccourci</span>
        <div className="flex h-11 items-center gap-2 rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)] px-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="var(--color-muted)" strokeWidth="2" />
            <path
              d="m20 20-3.5-3.5"
              stroke="var(--color-muted)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Rechercher un raccourci..."
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-[color:var(--color-muted)]"
          />
        </div>
      </label>

      <div
        role="tablist"
        aria-label="Mode"
        className="flex gap-1 rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)] p-1"
      >
        {modes.map((value) => {
          const active = value === mode;
          return (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => selectMode(value)}
              className={`touch-target flex-1 rounded-[8px] text-sm font-medium transition-colors duration-[var(--duration-fast)] ${
                active
                  ? 'bg-[color:var(--color-brand)] text-white'
                  : 'text-[color:var(--color-night)]'
              }`}
            >
              {MODE_LABELS[value]}
            </button>
          );
        })}
      </div>

      {/* Une seule ligne de chips, defilement horizontal (Spec UX/UI, 7). */}
      <div className="-mx-5 overflow-x-auto px-5">
        <div className="flex w-max gap-2 pb-1">
          <Chip label="Toutes" active={!categorySlug} onClick={() => selectCategory()} />
          {chips.map((chip) => (
            <Chip
              key={chip.slug}
              label={chip.name}
              active={chip.slug === categorySlug}
              onClick={() => selectCategory(chip.slug)}
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
