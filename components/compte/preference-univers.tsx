'use client';

import { useState, useTransition } from 'react';
import { showToast } from '@/components/ui/toast';
import { choisirUniversDAccueil } from '@/lib/actions/univers';
import { LIBRARIES, LIBRARY_LABELS, type Library } from '@/lib/constants';

type Choix = Library | 'dernier';

const OPTIONS: { valeur: Choix; libelle: string }[] = [
  { valeur: 'dernier', libelle: 'Dernier utilisé' },
  ...LIBRARIES.map((univers) => ({ valeur: univers, libelle: LIBRARY_LABELS[univers] })),
];

/**
 * L'univers sur lequel s'ouvrent l'accueil et la Bibliotheque.
 *
 * « Dernier utilise » par defaut : l'application reprend la ou l'on s'est
 * arrete. Fixer un univers le garde, quel que soit le dernier visite. Le
 * choix est enregistre des qu'on le touche ; il revient en arriere si
 * l'enregistrement echoue, et le dit.
 */
export function PreferenceUnivers({ initiale }: { initiale: Choix }) {
  const [choix, setChoix] = useState<Choix>(initiale);
  const [enCours, demarrer] = useTransition();

  const choisir = (valeur: Choix) => {
    const avant = choix;
    setChoix(valeur);
    demarrer(async () => {
      const resultat = await choisirUniversDAccueil(valeur).catch(() => ({ ok: false }));
      if (resultat.ok) {
        showToast('Préférence enregistrée');
      } else {
        setChoix(avant);
        showToast('La préférence n’a pas été enregistrée.', 'erreur');
      }
    });
  };

  return (
    <fieldset disabled={enCours} className="px-3.5 py-3">
      <legend className="sr-only">Univers d’accueil</legend>
      <p className="text-[length:var(--texte-corps)] text-[color:var(--color-night)]">
        Univers d’accueil
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 min-[400px]:grid-cols-4">
        {OPTIONS.map((option) => (
          <label
            key={option.valeur}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-[color:var(--radius-control)] px-2 text-center text-[length:var(--texte-carte)] font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[color:var(--color-brand)] ${
              choix === option.valeur
                ? 'bg-[color:var(--color-brand)] text-white'
                : 'border border-[color:var(--color-line)] text-[color:var(--color-night)]'
            }`}
          >
            <input
              type="radio"
              name="univers-accueil"
              value={option.valeur}
              checked={choix === option.valeur}
              onChange={() => choisir(option.valeur)}
              className="sr-only"
            />
            {option.libelle}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
