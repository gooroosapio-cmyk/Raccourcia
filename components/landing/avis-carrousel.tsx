'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Avis } from '@/lib/landing/avis';

/**
 * Avis, en rail qui defile.
 *
 * Le defilement est natif — `scroll-snap` et le doigt — et les deux fleches
 * ne font que le piloter pour la souris et le clavier. Un carrousel qui
 * avance tout seul enleve au lecteur le controle de sa lecture, et repart
 * toujours au moment ou il commencait une phrase.
 *
 * Le rail est une liste : un lecteur d'ecran annonce « 1 sur 3 » et les lit
 * a la suite, sans avoir a comprendre qu'il y a un mecanisme.
 */
export function AvisCarrousel({ avis }: { avis: Avis[] }) {
  const railRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState(0);

  const surDefilement = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const largeur = rail.firstElementChild?.clientWidth ?? 1;
    setPosition(Math.round(rail.scrollLeft / Math.max(largeur, 1)));
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    rail.addEventListener('scroll', surDefilement, { passive: true });
    return () => rail.removeEventListener('scroll', surDefilement);
  }, [surDefilement]);

  const glisser = (sens: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const largeur = rail.firstElementChild?.clientWidth ?? rail.clientWidth;
    rail.scrollBy({ left: sens * (largeur + 16), behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <ul
        ref={railRef}
        className="rail -mx-4 flex snap-x snap-mandatory gap-4 px-4 pb-2 sm:mx-0 sm:px-0"
      >
        {avis.map((entree, index) => (
          <li
            key={`${entree.auteur}-${index}`}
            className="w-[min(88vw,420px)] shrink-0 snap-center sm:w-[380px]"
          >
            <figure className="flex h-full flex-col rounded-[20px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
              <Etoiles note={entree.note} />
              <blockquote className="mt-3.5 flex-1 text-[length:var(--texte-corps)] leading-[1.6] text-[color:var(--color-night)]">
                « {entree.texte} »
              </blockquote>
              <figcaption className="mt-4 text-[length:var(--texte-carte)] text-[color:var(--color-muted)]">
                <span className="font-semibold text-[color:var(--color-night)]">
                  {entree.auteur}
                </span>{' '}
                · {entree.lieu}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      {avis.length > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <FlecheRail sens={-1} onClick={() => glisser(-1)} desactive={position === 0} />
          <p
            aria-live="polite"
            className="text-[length:var(--texte-carte)] text-[color:var(--color-muted)]"
          >
            {Math.min(position + 1, avis.length)} / {avis.length}
          </p>
          <FlecheRail sens={1} onClick={() => glisser(1)} desactive={position >= avis.length - 1} />
        </div>
      ) : null}
    </div>
  );
}

function Etoiles({ note }: { note: number }) {
  const pleines = Math.max(0, Math.min(5, Math.round(note)));

  return (
    <p className="flex items-center gap-0.5" aria-label={`${pleines} étoiles sur 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <svg key={index} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z"
            fill={index < pleines ? 'var(--color-brand)' : 'var(--color-line-strong)'}
          />
        </svg>
      ))}
    </p>
  );
}

function FlecheRail({
  sens,
  onClick,
  desactive,
}: {
  sens: -1 | 1;
  onClick: () => void;
  desactive: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desactive}
      aria-label={sens === -1 ? 'Avis précédent' : 'Avis suivant'}
      className="touch-target inline-flex items-center justify-center rounded-full border border-[color:var(--color-line-strong)] text-[color:var(--color-night)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--color-brand)] hover:text-[color:var(--color-brand)] disabled:opacity-35 disabled:hover:border-[color:var(--color-line-strong)] disabled:hover:text-[color:var(--color-night)]"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={sens === -1 ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'}
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
