'use client';

import { useState } from 'react';

/**
 * Le raccourci, et un bouton qui ne copie QUE lui.
 *
 * Deux copies coexistent sur une fiche, et les confondre serait couteux :
 *
 *   * cette petite icone copie « /toybox », le mot qu'on tape dans une
 *     conversation deja ouverte ;
 *   * le bouton bleu du bas copie le texte complet, compile pour l'IA
 *     choisie.
 *
 * Elles sont donc dessinees differemment — une icone discrete contre un
 * bouton pleine largeur — et annoncent deux messages distincts. Un
 * utilisateur qui croit avoir copie le prompt et ne colle que « /toybox »
 * obtient une reponse absurde, et n'a aucun moyen de comprendre pourquoi.
 *
 * Le retour vit ici et nulle part ailleurs : un toast global dirait
 * « Copie » sans dire quoi.
 */
export function CopieDuRaccourci({ commande }: { commande: string }) {
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(commande);
      setCopie(true);
      // Deux secondes : le temps de lire, pas assez pour que le mot reste
      // et fasse croire que le bouton est bloque.
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Le presse-papier peut etre refuse — contexte non securise, refus
      // de l'utilisateur. Le raccourci reste lisible et selectionnable a
      // cote : il n'y a rien a annoncer.
    }
  };

  return (
    <div className="mt-1.5 flex items-center gap-2 rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)] py-1.5 pl-3 pr-1.5">
      <code className="commande min-w-0 flex-1 truncate text-[length:var(--texte-corps)] font-semibold text-[color:var(--color-brand)]">
        {commande}
      </code>

      <button
        type="button"
        onClick={copier}
        aria-label={`Copier le raccourci ${commande}`}
        className="touch-target inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[color:var(--radius-control)] px-2 text-[length:var(--texte-meta)] font-medium text-[color:var(--color-muted)]"
      >
        {copie ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="m5 13 4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span aria-live="polite">Copiée</span>
          </>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="9"
              y="9"
              width="11"
              height="11"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.9"
            />
            <path
              d="M5 15V6a1 1 0 0 1 1-1h9"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
