'use client';

import { useEffect, useRef, useState } from 'react';
import { SheetCloseButton } from '@/components/ui/sheet-close';

/**
 * Filtres avances, tels qu'ils voyagent dans l'URL.
 *
 * Trois axes seulement : ce que je peux copier, avec quelle IA, pour obtenir
 * quoi. Les categories ont deja leur rangee de chips ; les reproduire ici
 * doublerait le meme choix a deux endroits.
 */
export type FiltresAvances = {
  acces?: 'gratuit' | 'membre';
  ia?: 'chatgpt' | 'claude' | 'gemini';
  sortie?: 'image' | 'texte' | 'pdf';
};

const GROUPES = [
  {
    cle: 'acces' as const,
    titre: 'Acces',
    options: [
      { valeur: 'gratuit', libelle: 'Gratuits' },
      { valeur: 'membre', libelle: 'Reserves aux membres' },
    ],
  },
  {
    cle: 'ia' as const,
    titre: 'IA compatible',
    options: [
      { valeur: 'chatgpt', libelle: 'ChatGPT' },
      { valeur: 'claude', libelle: 'Claude' },
      { valeur: 'gemini', libelle: 'Gemini' },
    ],
  },
  {
    cle: 'sortie' as const,
    titre: 'Format de sortie',
    options: [
      { valeur: 'image', libelle: 'Image' },
      { valeur: 'texte', libelle: 'Texte' },
      { valeur: 'pdf', libelle: 'PDF' },
    ],
  },
];

/**
 * Panneau de filtres, en bottom sheet sur mobile.
 *
 * Les choix ne s'appliquent qu'a la validation. Filtrer a chaque clic
 * rechargerait la liste sous le panneau, que l'utilisateur ne voit pas :
 * il validerait a l'aveugle.
 */
export function FilterSheet({
  valeurs,
  resultCount,
  onApply,
  onClose,
}: {
  valeurs: FiltresAvances;
  resultCount: number;
  onApply: (valeurs: FiltresAvances) => void;
  onClose: () => void;
}) {
  const [brouillon, setBrouillon] = useState<FiltresAvances>(valeurs);
  const fermerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fermerRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const basculer = (cle: keyof FiltresAvances, valeur: string) => {
    setBrouillon((precedent) => ({
      ...precedent,
      // Recliquer sur un choix deja actif le retire : c'est le geste attendu
      // et cela evite une croix supplementaire par option.
      [cle]: precedent[cle] === valeur ? undefined : valeur,
    }));
  };

  const inchange = JSON.stringify(brouillon) === JSON.stringify(valeurs);

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center">
      {/* Le fond referme au toucher, mais il n'est pas annonce : la croix
          porte deja ce nom, et deux commandes homonymes se suivant dans la
          lecture vocale ne disent pas laquelle fait quoi. Le clavier a la
          croix et la touche Echap. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="anim-fondu absolute inset-0 bg-[color:var(--color-night)]/45"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filtres-titre"
        className="anim-sheet relative flex max-h-[85dvh] w-full max-w-screen-sm flex-col overflow-y-auto rounded-t-[color:var(--radius-sheet)] bg-[color:var(--color-surface)] shadow-[var(--shadow-sheet)]"
      >
        <header className="sticky top-0 flex items-center justify-between border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-5 py-3">
          <h2
            id="filtres-titre"
            className="text-[19px] font-semibold text-[color:var(--color-night)]"
          >
            Filtres
          </h2>
          <span className="-mr-2">
            <SheetCloseButton ref={fermerRef} onClose={onClose} libelle="Fermer les filtres" />
          </span>
        </header>

        <div className="space-y-5 px-5 py-4">
          {GROUPES.map((groupe) => (
            <fieldset key={groupe.cle}>
              <legend className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
                {groupe.titre}
              </legend>
              <div className="flex flex-wrap gap-2">
                {groupe.options.map((option) => {
                  const actif = brouillon[groupe.cle] === option.valeur;
                  return (
                    <button
                      key={option.valeur}
                      type="button"
                      aria-pressed={actif}
                      onClick={() => basculer(groupe.cle, option.valeur)}
                      className={`touch-target rounded-full px-4 text-[14px] font-medium transition-colors duration-[var(--duration-fast)] ${
                        actif
                          ? 'bg-[color:var(--color-brand)] text-white'
                          : 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]'
                      }`}
                    >
                      {option.libelle}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={() => setBrouillon({})}
            className="h-13 flex-1 rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] text-[15px] font-semibold text-[color:var(--color-night)]"
          >
            Reinitialiser
          </button>
          <button
            type="button"
            onClick={() => onApply(brouillon)}
            className="h-13 flex-[1.4] rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] text-[15px] font-semibold text-white transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--color-brand-strong)]"
          >
            {/* Le compte n'est affiche que s'il est encore juste : des que le
                brouillon change, il ne decrit plus la liste. */}
            {inchange ? `Voir les ${resultCount} résultats` : 'Voir les résultats'}
          </button>
        </div>
      </div>
    </div>
  );
}
