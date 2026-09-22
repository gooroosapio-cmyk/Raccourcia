'use client';

import { useEffect, useRef } from 'react';
import { ActionsDOffre, ArgumentaireDOffre, type Offre } from '@/components/paywall/upgrade-panel';
import { SheetCloseButton } from '@/components/ui/sheet-close';
import { SheetDragHandle, useSheetDrag } from '@/components/ui/sheet-drag';

/**
 * Fenetre d'offre de l'acces a vie.
 *
 * Elle s'ouvre quand un visiteur sans acces bute sur une limite : copie d'une
 * commande verrouillee, ou tentative d'ouvrir un espace autre que le
 * catalogue. Elle s'ouvre aussi d'elle-meme apres un temps de lecture.
 *
 * Elle reste fermable. Un mur infranchissable ferait fuir avant d'avoir
 * convaincu : la fermeture ramene simplement aux commandes offertes, les
 * seules que le visiteur peut copier.
 *
 * Elle se repousse du pouce, comme la fiche d'une commande. Elle portait deja
 * la poignee — ce petit trait horizontal qui, sur telephone, veut dire « ca
 * se glisse » — mais le geste ne faisait rien. Une fenetre qui refuse le
 * geste qu'elle annonce donne l'impression d'un mur, precisement sur l'ecran
 * ou il ne faut pas.
 */
export function OfferSheet({ offre, onClose }: { offre: Offre; onClose: () => void }) {
  const fermerRef = useRef<HTMLButtonElement>(null);
  const contenuRef = useRef<HTMLDivElement>(null);
  const glissement = useSheetDrag({ onClose, contenuRef });

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offre-titre"
    >
      {/* Le fond referme au toucher, mais il n'est pas annonce : la croix
          porte deja ce nom, et deux commandes homonymes se suivant dans la
          lecture vocale ne disent pas laquelle fait quoi. Le clavier a la
          croix et la touche Echap. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{ opacity: glissement.opaciteFond }}
        className="anim-fondu absolute inset-0 bg-[color:var(--color-night)]/45"
      />

      <div
        style={glissement.style}
        className="anim-sheet relative flex max-h-[90dvh] w-full max-w-screen-sm flex-col overflow-hidden rounded-t-[color:var(--radius-sheet)] bg-[color:var(--color-surface)] shadow-[var(--shadow-sheet)] transition-transform duration-[var(--duration-sheet)] ease-[var(--ease-out)]"
      >
        {/* La zone de prise couvre la poignee et la croix : c'est la qu'un
            pouce se pose pour repousser la fenetre. Le contenu, lui, garde son
            defilement — le geste ne lui est pas vole.

            La poignee dit que le panneau se glisse ; la croix donne la sortie
            a qui ne glisse pas — souris, clavier, lecteur d'ecran. Elle est
            en haut parce que le lien du bas oblige a parcourir toute l'offre
            avant d'etre atteint. */}
        <div {...glissement.poignee} className="shrink-0 touch-none px-5 pt-1">
          <SheetDragHandle />
          <div className="relative mb-2 flex items-center justify-end">
            <span className="-mr-1">
              <SheetCloseButton ref={fermerRef} onClose={onClose} libelle="Fermer l’offre" />
            </span>
          </div>
        </div>

        {/* L'ARGUMENTAIRE DEFILE, L'ACTION NON.
            La fenetre empilait tout dans une seule zone defilante : sur un
            telephone, le prix et le bouton tombaient sous le bord et il
            fallait faire defiler l'offre pour trouver comment l'accepter.
            Demander un geste de plus sur l'ecran meme ou l'on decide
            d'acheter est le pire endroit du produit pour en demander un.

            Le pied ne defile pas. Le prix et les deux boutons sont donc
            atteignables sans rien faire, quelle que soit la hauteur du
            telephone et quelle que soit la longueur de l'argumentaire —
            c'est une garantie de structure, pas un reglage a reprendre au
            prochain ecran plus petit. */}
        <div ref={contenuRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
          <div id="offre-titre">
            <ArgumentaireDOffre compact />
          </div>
        </div>

        <div className="shrink-0 border-t border-[color:var(--color-line)] px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <ActionsDOffre offre={offre} />

          <button
            type="button"
            onClick={onClose}
            className="mt-1 flex h-11 w-full items-center justify-center text-[13px] text-[color:var(--color-muted)]"
          >
            Continuer avec les commandes offertes
          </button>
        </div>
      </div>
    </div>
  );
}
