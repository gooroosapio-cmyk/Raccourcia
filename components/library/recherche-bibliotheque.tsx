'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

/**
 * La recherche de la Bibliotheque.
 *
 * Elle mene au catalogue filtre, pas a une page de resultats a part : la
 * liste est la meme, seul son perimetre change. C'est aussi la seule
 * recherche visible de l'application depuis que l'accueil a range la sienne
 * dans le filtre depliant — un catalogue de mille cartes sans moyen de
 * chercher un nom qu'on connait deja serait mille cartes a faire defiler.
 *
 * Elle ne cherche pas a la frappe. Ici, contrairement a une liste qu'on
 * affine sous les yeux, il n'y a rien a affiner : la page est un sommaire,
 * et chaque lettre declencherait une navigation. On valide, donc.
 */
export function RechercheBibliotheque() {
  const router = useRouter();
  const [terme, setTerme] = useState('');
  const [, demarrer] = useTransition();

  const chercher = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    const mot = terme.trim();
    if (!mot) return;
    demarrer(() => router.push(`/app?q=${encodeURIComponent(mot)}`));
  };

  return (
    <form role="search" onSubmit={chercher} className="relative">
      <label htmlFor="recherche-bibliotheque" className="sr-only">
        Rechercher une commande
      </label>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <input
        id="recherche-bibliotheque"
        type="search"
        value={terme}
        onChange={(evenement) => setTerme(evenement.target.value)}
        enterKeyHint="search"
        placeholder="Rechercher une commande, un style, un usage…"
        className="h-[50px] w-full rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] pl-11 pr-3 text-[15px] outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-brand)] focus:shadow-[0_0_0_3px_var(--color-brand-soft)]"
      />
    </form>
  );
}
