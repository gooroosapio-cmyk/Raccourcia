'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Fermeture d'un panneau par glissement vers le bas.
 *
 * Sur un telephone tenu d'une main, la croix de fermeture est en haut de
 * l'ecran, hors d'atteinte du pouce. Le geste, lui, part de la ou le pouce se
 * trouve deja.
 *
 * Le geste ne remplace jamais les autres sorties : croix, Echap, bouton
 * Retour et clic sur le fond restent la. Un utilisateur au clavier, un
 * lecteur d'ecran ou une souris n'ont aucun moyen de glisser.
 *
 * Conflit avec le defilement : le panneau ne suit le doigt que si son contenu
 * est deja en haut. Sinon le geste appartient au contenu, qui remonte
 * normalement — sans cette regle, tout defilement vers le bas fermerait la
 * fiche.
 */
export function useSheetDrag({
  onClose,
  contenuRef,
}: {
  onClose: () => void;
  /** Zone defilante du panneau : son `scrollTop` arbitre le conflit. */
  contenuRef: React.RefObject<HTMLElement | null>;
}) {
  const [decalage, setDecalage] = useState(0);
  const [glisse, setGlisse] = useState(false);
  const depart = useRef<{ y: number; temps: number } | null>(null);

  /** Au-dela, on considere que l'intention est de fermer. */
  const SEUIL_DISTANCE = 90;
  /** Un geste bref et rapide ferme aussi, meme court. */
  const SEUIL_VITESSE = 0.55;

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    // Un bouton dans l'en-tete garde ses propres clics.
    if ((event.target as HTMLElement).closest('button, a')) return;

    // Capture du pointeur : le panneau descend sous le doigt, et sans capture
    // les evenements suivants partent a l'element qui se retrouve dessous. Le
    // geste s'interrompait alors au premier pixel.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    depart.current = { y: event.clientY, temps: event.timeStamp };
    setGlisse(true);
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!depart.current) return;

      const delta = event.clientY - depart.current.y;
      if (delta <= 0) {
        setDecalage(0);
        return;
      }

      // Le contenu prime tant qu'il n'est pas revenu en haut.
      if ((contenuRef.current?.scrollTop ?? 0) > 0) {
        depart.current = { y: event.clientY, temps: event.timeStamp };
        setDecalage(0);
        return;
      }

      setDecalage(delta);
    },
    [contenuRef],
  );

  const terminer = useCallback(
    (event: React.PointerEvent) => {
      if (!depart.current) return;

      const delta = event.clientY - depart.current.y;
      const duree = Math.max(event.timeStamp - depart.current.temps, 1);
      const vitesse = delta / duree;

      event.currentTarget.releasePointerCapture?.(event.pointerId);
      depart.current = null;
      setGlisse(false);

      if (delta > SEUIL_DISTANCE || (delta > 24 && vitesse > SEUIL_VITESSE)) {
        onClose();
        return;
      }

      // Sous le seuil, le panneau revient exactement ou il etait.
      setDecalage(0);
    },
    [onClose],
  );

  return {
    /** A poser sur la poignee et l'en-tete, jamais sur le contenu. */
    poignee: {
      onPointerDown,
      onPointerMove,
      onPointerUp: terminer,
      onPointerCancel: terminer,
    },
    /** Suivi du doigt : `transform` seul, pour ne rien faire recalculer. */
    style: {
      transform: decalage ? `translateY(${decalage}px)` : undefined,
      transition: glisse ? 'none' : undefined,
    } as React.CSSProperties,
    /** Le fond s'eclaircit a mesure que le panneau descend. */
    opaciteFond: Math.max(0, 1 - decalage / 320),
  };
}

/**
 * Poignee visible du panneau.
 *
 * Elle annonce que le panneau se glisse, et sert de zone de prise : sans
 * repere, personne n'essaie le geste.
 */
export function SheetDragHandle() {
  return (
    <div className="flex justify-center pb-1 pt-2.5" aria-hidden="true">
      <span className="block h-1 w-10 rounded-full bg-[color:var(--color-line-strong)]" />
    </div>
  );
}
