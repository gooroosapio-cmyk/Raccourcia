'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

/**
 * Le tri de la liste, en une liste deroulante (rapport de refonte, p. 11) :
 * quatre gros boutons occupaient une rangee pour un reglage qu'on change
 * rarement. Les filtres sont conserves ; la page revient a la premiere.
 */
export function ChoixDuTri({
  actuel,
  options,
}: {
  actuel: string;
  options: { valeur: string; libelle: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, demarrer] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-[color:var(--color-muted)]">
      Trier
      <select
        value={actuel}
        onChange={(evenement) => {
          const suite = new URLSearchParams(params.toString());
          suite.set('tri', evenement.target.value);
          suite.delete('page');
          demarrer(() => router.replace(`/admin/raccourcis?${suite}`, { scroll: false }));
        }}
        className="h-11 rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px] text-[color:var(--color-night)]"
      >
        {options.map((option) => (
          <option key={option.valeur} value={option.valeur}>
            {option.libelle}
          </option>
        ))}
      </select>
    </label>
  );
}
