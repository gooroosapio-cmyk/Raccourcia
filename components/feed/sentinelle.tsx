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
 *
 * ET IL DIT QU'IL TRAVAILLE. Entre le declenchement et l'arrivee des
 * cartes, l'ecran ne disait rien : sur un reseau lent, le bas d'une
 * galerie muette se lit comme une fin de liste, et on remonte. Trois
 * points suffisent — ils tiennent sur une ligne, ne deplacent pas ce qui
 * est deja a l'ecran, et s'effacent des que le palier arrive.
 */
export function Sentinelle({
  onVisible,
  libelle,
  racine,
  charge = false,
  avance = 1,
}: {
  /** Memorise par l'appelant : il decide de l'observateur. */
  onVisible: () => void;
  /** Ce que le bouton de repli annonce. */
  libelle: string;
  /** Vrai pendant que le palier suivant arrive. */
  charge?: boolean;
  /**
   * Le conteneur qui defile, quand ce n'est pas la page.
   *
   * Sans lui, la marge d'avance ne sert a rien dans une liste logee dans sa
   * propre zone de defilement : l'observateur etend la fenetre, mais le
   * conteneur decoupe quand meme, et la suite n'est demandee qu'une fois le
   * bas atteint — c'est-a-dire trop tard.
   */
  racine?: React.RefObject<HTMLElement | null>;
  /**
   * De combien de hauteurs d'ecran on prend de l'avance.
   *
   * Une suffit a une galerie : on y descend par petits gestes, et une
   * hauteur d'ecran represente six a huit cartes de reserve.
   *
   * Elle ne suffit pas a un feed plein ecran ou une carte OCCUPE l'ecran :
   * une hauteur d'avance ne vaut plus qu'une carte, donc la demande part
   * au moment ou l'on arrive sur la derniere et le geste suivant bute sur
   * du vide. Decouvrir en prend trois — trois cartes de reserve, soit le
   * temps d'un aller-retour reseau meme lent.
   */
  avance?: number;
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
      // L'avance, en hauteurs d'ecran : la suite arrive avant le bas.
      { root: racine?.current ?? null, rootMargin: `${avance * 100}% 0px` },
    );
    observateur.observe(noeud);
    return () => observateur.disconnect();
  }, [onVisible, racine, avance]);

  return (
    <div ref={cible} className="mt-3">
      {/* `aria-live` polie et non assertive : l'annonce attend une pause
          dans la lecture plutot que de couper la carte en cours. */}
      <p
        aria-live="polite"
        className={`flex items-center justify-center gap-1.5 py-2 ${charge ? '' : 'invisible'}`}
      >
        <span className="sr-only">Chargement de la suite…</span>
        {[0, 1, 2].map((rang) => (
          <span
            key={rang}
            aria-hidden="true"
            className="point-de-chargement block h-1.5 w-1.5 rounded-full bg-[color:var(--color-brand)]"
            // Le decalage fait l'onde : trois points qui battent ensemble
            // se lisent comme un clignotement, pas comme une progression.
            style={{ animationDelay: `${rang * 0.14}s` }}
          />
        ))}
      </p>

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
