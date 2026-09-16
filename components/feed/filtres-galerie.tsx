'use client';

import { useState } from 'react';
import {
  FORMATS,
  FORMAT_LABELS,
  SUJETS,
  SUJET_LABELS,
  nombreDeFiltresActifs,
  type FiltresGalerie,
} from '@/lib/catalog/sujets';

/**
 * Les filtres de la galerie : l'essentiel visible, le reste a un geste.
 *
 * Deux listes et non une. Le format dit ce qu'on manipule — une commande, un
 * mode, un parcours ; le sujet dit sur quoi ca porte — une personne, un
 * objet. Une seule liste melangeait les deux : choisir « Modes IA » repondait
 * a une autre question que celle posee, et demander « les modes qui portent
 * sur une personne » devenait impossible.
 *
 * L'acces reste derriere « Plus d'options ». C'est le filtre le moins
 * demande — on sait ce qu'on a achete — et une troisieme liste en travers de
 * l'ecran prendrait la hauteur de la premiere rangee de cartes.
 */
export function FiltresDeGalerie({
  valeurs,
  onChange,
}: {
  valeurs: FiltresGalerie;
  onChange: (valeurs: FiltresGalerie) => void;
}) {
  const [optionsOuvertes, setOptionsOuvertes] = useState(false);
  const actifs = nombreDeFiltresActifs(valeurs);

  return (
    <div className="mb-3 space-y-2">
      <div className="flex items-center gap-2">
        <Liste
          libelle="Format"
          valeur={valeurs.format ?? ''}
          parDefaut="Tous les formats"
          options={FORMATS.map((format) => ({ valeur: format, libelle: FORMAT_LABELS[format] }))}
          onChange={(valeur) =>
            onChange({ ...valeurs, format: (valeur || undefined) as FiltresGalerie['format'] })
          }
        />
        <Liste
          libelle="Sujet"
          valeur={valeurs.sujet ?? ''}
          parDefaut="Tous les sujets"
          options={SUJETS.map((sujet) => ({ valeur: sujet, libelle: SUJET_LABELS[sujet] }))}
          onChange={(valeur) =>
            onChange({ ...valeurs, sujet: (valeur || undefined) as FiltresGalerie['sujet'] })
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={() => setOptionsOuvertes((ouvert) => !ouvert)}
          aria-expanded={optionsOuvertes}
          className="touch-target inline-flex items-center gap-1 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-brand)]"
        >
          Plus d’options
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={`transition-transform duration-[var(--duration-fast)] ${
              optionsOuvertes ? 'rotate-180' : ''
            }`}
          >
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {actifs > 0 ? (
          <>
            <span className="text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
              {actifs} filtre{actifs > 1 ? 's' : ''} actif{actifs > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => onChange({})}
              className="touch-target text-[length:var(--texte-carte)] font-medium text-[color:var(--color-muted)] underline underline-offset-2"
            >
              Tout effacer
            </button>
          </>
        ) : null}
      </div>

      {optionsOuvertes ? (
        <Liste
          libelle="Accès"
          valeur={valeurs.acces ?? ''}
          parDefaut="Tous les accès"
          options={[
            { valeur: 'gratuit', libelle: 'Gratuites' },
            { valeur: 'membre', libelle: 'Accès à vie' },
          ]}
          onChange={(valeur) =>
            onChange({ ...valeurs, acces: (valeur || undefined) as FiltresGalerie['acces'] })
          }
        />
      ) : null}
    </div>
  );
}

function Liste({
  libelle,
  valeur,
  parDefaut,
  options,
  onChange,
}: {
  libelle: string;
  valeur: string;
  parDefaut: string;
  options: { valeur: string; libelle: string }[];
  onChange: (valeur: string) => void;
}) {
  return (
    <label className="min-w-0 flex-1">
      <span className="sr-only">{libelle}</span>
      <select
        value={valeur}
        onChange={(evenement) => onChange(evenement.target.value)}
        className={`touch-target w-full rounded-[color:var(--radius-control)] border px-3 text-[length:var(--texte-carte)] font-medium transition-colors duration-[var(--duration-fast)] ${
          valeur
            ? 'border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-strong)]'
            : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-night)]'
        }`}
      >
        <option value="">{parDefaut}</option>
        {options.map((option) => (
          <option key={option.valeur} value={option.valeur}>
            {option.libelle}
          </option>
        ))}
      </select>
    </label>
  );
}
