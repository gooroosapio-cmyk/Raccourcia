'use client';

import { useEffect, useRef } from 'react';

/**
 * Le bas de la galerie, qui demande la suite en arrivant a l'ecran.
 *
 * La galerie s'allongeait par un bouton « Voir plus d'idees ». Un bouton tous
 * les vingt-quatre cartes interrompt la seule chose qu'on fait sur cet
 * ecran — descendre — et il faut le viser au pouce pour continuer. Sur une
 * galerie qu'on parcourt longtemps, cela revient a demander la permission de
 * continuer a regarder.
 *
 * L'observateur charge le palier suivant avant que le bas ne soit atteint :
 * la marge de declenchement vaut une hauteur d'ecran, donc la suite est deja
 * la quand on y arrive.
 *
 * Le bouton reste, hors de vue mais pas hors d'atteinte : il redevient
 * visible des qu'il recoit le focus. Un defilement infini sans equivalent
 * actionnable enferme qui navigue au clavier — il arrive au bas de la liste
 * et n'a aucun moyen de demander la suite. Le bouton est cet equivalent, et
 * c'est aussi lui qui repond si l'observateur n'existe pas.
 */
export function Sentinelle({
  onVisible,
  libelle,
  racine,
}: {
  /** Memorise par l'appelant : il decide de l'observateur. */
  onVisible: () => void;
  /** Ce que le bouton de repli annonce. */
  libelle: string;
  /**
   * Le conteneur qui defile, quand ce n'est pas la page.
   *
   * Sans lui, la marge d'avance ne sert a rien dans une liste logee dans sa
   * propre zone de defilement : l'observateur etend la fenetre, mais le
   * conteneur decoupe quand meme, et la suite n'est demandee qu'une fois le
   * bas atteint — c'est-a-dire trop tard.
   */
  racine?: React.RefObject<HTMLElement | null>;
}) {
  const cible = useRef<HTMLDivElement>(null);

  // `onVisible` figure dans les dependances plutot que d'etre range dans une
  // reference ecrite pendant le rendu : l'appelant le memorise, donc
  // l'observateur n'est refait que lorsque le comportement change vraiment.
  useEffect(() => {
    const noeud = cible.current;
    if (!noeud || typeof IntersectionObserver === 'undefined') return;

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) if (entree.isIntersecting) onVisible();
      },
      // Une hauteur d'ecran d'avance : la suite arrive avant le bas.
      { root: racine?.current ?? null, rootMargin: '100% 0px' },
    );
    observateur.observe(noeud);
    return () => observateur.disconnect();
  }, [onVisible, racine]);

  return (
    <div ref={cible} className="mt-3">
      <button
        type="button"
        onClick={onVisible}
        className="touch-target sr-only flex w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[15px] font-medium text-[color:var(--color-night)] focus:not-sr-only"
      >
        {libelle}
      </button>
    </div>
  );
}
