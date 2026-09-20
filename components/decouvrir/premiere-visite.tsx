'use client';

import { useSyncExternalStore } from 'react';

/**
 * Ce qu'on explique une fois, a la premiere visite.
 *
 * Decouvrir ne ressemble a aucune autre page de l'application : pas de
 * liste, pas de filtre, une carte par ecran et deux gestes qui ne se
 * devinent pas — vers le bas pour changer de commande, vers la droite pour
 * rester dans la meme collection. Sans un mot, on fait defiler quelques
 * cartes et on repart.
 *
 * Trois phrases, une fois, et plus jamais. Un tutoriel qui revient est une
 * punition ; celui-ci se ferme au premier geste et ne se rouvre pas.
 *
 * LE SOUVENIR VIT DANS LE NAVIGATEUR, pas en base. C'est une preference
 * d'affichage propre a un appareil : la porter cote serveur demanderait un
 * compte — or la page est ouverte aux visiteurs, et ce sont eux qui en ont
 * le plus besoin.
 */
const CLE = 'raccourcia:decouvrir-vu';

/**
 * `localStorage` lu comme une source exterieure, et non dans un effet.
 *
 * Le reflexe — un effet qui lit puis appelle `setState` — provoque un
 * second rendu juste apres le premier, et le compilateur React le refuse.
 * `useSyncExternalStore` est fait pour cela : il donne une valeur au
 * serveur, une autre au navigateur, sans rendu en cascade et sans
 * divergence entre les deux.
 */
const abonnes = new Set<() => void>();

function sabonner(prevenir: () => void) {
  abonnes.add(prevenir);
  return () => {
    abonnes.delete(prevenir);
  };
}

function lireDansLeNavigateur(): boolean {
  try {
    return window.localStorage.getItem(CLE) === null;
  } catch {
    // Mode prive, stockage refuse : on ne montre rien plutot que de
    // remontrer l'apercu a chaque passage.
    return false;
  }
}

/** Au serveur, rien : l'apercu n'existe que pour un navigateur qui se souvient. */
function lireAuServeur(): boolean {
  return false;
}

export function PremiereVisite() {
  const montre = useSyncExternalStore(sabonner, lireDansLeNavigateur, lireAuServeur);

  const fermer = () => {
    try {
      window.localStorage.setItem(CLE, '1');
    } catch {
      // Sans stockage, l'apercu reviendra au prochain chargement. C'est le
      // moindre mal : l'alternative serait de ne jamais l'afficher.
    }
    for (const prevenir of abonnes) prevenir();
  };

  if (!montre) return null;

  return (
    <div className="anim-fondu fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 pb-28">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="apercu-decouvrir"
        className="w-full max-w-sm rounded-[color:var(--radius-card)] bg-[color:var(--color-surface)] p-5"
      >
        <h2
          id="apercu-decouvrir"
          className="text-[19px] font-bold leading-tight text-[color:var(--color-night)]"
        >
          Découvrir, en deux gestes
        </h2>

        <ul className="mt-3 space-y-2.5">
          <Geste fleche="bas" texte="Glissez vers le haut : la commande suivante, au hasard." />
          <Geste
            fleche="droite"
            texte="Glissez une vignette vers la gauche : la même collection."
          />
          <Geste
            fleche="doigt"
            texte="Touchez le nom ou le bouton : la fiche, pour copier la commande."
          />
        </ul>

        <button
          type="button"
          onClick={fermer}
          className="touch-target mt-4 flex w-full items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-4 text-[15px] font-semibold text-white"
        >
          J’ai compris
        </button>
      </div>
    </div>
  );
}

function Geste({ fleche, texte }: { fleche: 'bas' | 'droite' | 'doigt'; texte: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-sky)] text-[color:var(--color-brand)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          {fleche === 'bas' ? (
            <path
              d="M12 19V5m0 14-5-5m5 5 5-5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : fleche === 'droite' ? (
            <path
              d="M5 12h14m0 0-5-5m5 5-5 5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M9 11V6.5a1.5 1.5 0 0 1 3 0V11m0 0V9.5a1.5 1.5 0 0 1 3 0V12m0 0v-1a1.5 1.5 0 0 1 3 0v5a5 5 0 0 1-5 5h-1.6a4 4 0 0 1-3.1-1.5L6 16"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </span>
      <span className="text-[length:var(--texte-carte)] leading-snug text-[color:var(--color-night)]">
        {texte}
      </span>
    </li>
  );
}
