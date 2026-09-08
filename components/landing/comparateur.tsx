'use client';

import Image from 'next/image';
import { useId, useState } from 'react';

/**
 * Comparateur « Sans RaccourcIA / Avec RaccourcIA ».
 *
 * Deux panneaux qui s'echangent au meme endroit, plutot que cote a cote :
 * sur un telephone, deux colonnes de trois cents pixels ne se comparent pas,
 * elles se subissent. En les superposant, l'oeil garde le meme cadre et ne
 * voit que ce qui change — c'est precisement le propos de la section.
 *
 * Le controle est un vrai groupe d'onglets : les fleches du clavier passent
 * d'un panneau a l'autre, et le panneau masque sort de l'ordre de lecture.
 */
export type PanneauComparaison = {
  cle: string;
  onglet: string;
  titre: string;
  lignes: string[];
  /**
   * Illustration du panneau. Facultative : tant qu'elle manque, le panneau
   * se defend avec ses seules lignes, plutot que d'afficher un cadre vide.
   */
  image?: { src: string; alt: string };
};

export function Comparateur({ panneaux }: { panneaux: [PanneauComparaison, PanneauComparaison] }) {
  const [actif, setActif] = useState(panneaux[1].cle);
  const id = useId();

  return (
    <div>
      <div
        role="tablist"
        aria-label="Comparer sans et avec RaccourcIA"
        className="mx-auto grid max-w-md grid-cols-2 gap-1 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] p-1"
      >
        {panneaux.map((panneau) => {
          const selectionne = panneau.cle === actif;
          return (
            <button
              key={panneau.cle}
              type="button"
              role="tab"
              id={`${id}-onglet-${panneau.cle}`}
              aria-selected={selectionne}
              aria-controls={`${id}-panneau-${panneau.cle}`}
              onClick={() => setActif(panneau.cle)}
              className={`h-12 rounded-full px-3 text-[15px] font-semibold transition-colors duration-[var(--duration-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-brand)] ${
                selectionne
                  ? 'bg-[color:var(--color-brand)] text-white shadow-[0_2px_10px_rgb(20_99_255_/_0.22)]'
                  : 'text-[color:var(--color-muted)] hover:text-[color:var(--color-night)]'
              }`}
            >
              {panneau.onglet}
            </button>
          );
        })}
      </div>

      {panneaux.map((panneau) => {
        const selectionne = panneau.cle === actif;
        const positif = panneau.cle === panneaux[1].cle;

        return (
          <div
            key={panneau.cle}
            role="tabpanel"
            id={`${id}-panneau-${panneau.cle}`}
            aria-labelledby={`${id}-onglet-${panneau.cle}`}
            hidden={!selectionne}
            className="anim-apparition mx-auto mt-6 max-w-3xl"
          >
            <div
              className={`overflow-hidden rounded-[20px] border ${
                positif
                  ? 'border-[color:var(--color-brand)]/25 bg-[color:var(--color-sky)]/45'
                  : 'border-[color:var(--color-line)] bg-[color:var(--color-canvas)]'
              }`}
            >
              {panneau.image ? (
                <Image
                  src={panneau.image.src}
                  alt={panneau.image.alt}
                  width={1200}
                  height={800}
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 760px"
                  className="w-full border-b border-[color:var(--color-line)]"
                />
              ) : null}

              <div className="p-5 sm:p-6">
                <h3 className="text-[length:var(--texte-section)] font-bold text-[color:var(--color-night)]">
                  {panneau.titre}
                </h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {panneau.lignes.map((ligne) => (
                    <li
                      key={ligne}
                      className="flex items-start gap-3 text-[length:var(--texte-corps)] leading-[1.55]"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          positif
                            ? 'bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]'
                            : 'bg-[color:var(--color-line)] text-[color:var(--color-muted)]'
                        }`}
                      >
                        {positif ? <CocheIcone /> : <CroixIcone />}
                      </span>
                      <span
                        className={
                          positif
                            ? 'text-[color:var(--color-night)]'
                            : 'text-[color:var(--color-muted)]'
                        }
                      >
                        {ligne}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CocheIcone() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 13 4 4L19 7"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CroixIcone() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
