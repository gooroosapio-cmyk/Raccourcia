'use client';

import { useEffect, useState } from 'react';

/**
 * Barre d'achat fixe, sur telephone uniquement.
 *
 * Elle n'apparait qu'apres le hero. Posee des le premier pixel, elle
 * masquerait les boutons de ce meme hero et proposerait d'acheter avant
 * d'avoir rien montre — la premiere chose que la page dirait serait
 * « payez ».
 *
 * Elle s'efface a l'approche de la carte d'offre, qui porte le meme bouton
 * en plus grand : deux appels identiques a l'ecran se font concurrence.
 */
export function StickyMobileCTA({ purchaseUrl, prix }: { purchaseUrl: string; prix: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const offre = document.getElementById('offre');

    const surDefilement = () => {
      const passeLeHero = window.scrollY > 520;
      const offreProche = offre
        ? offre.getBoundingClientRect().top < window.innerHeight * 0.9
        : false;
      setVisible(passeLeHero && !offreProche);
    };

    surDefilement();
    window.addEventListener('scroll', surDefilement, { passive: true });
    window.addEventListener('resize', surDefilement);
    return () => {
      window.removeEventListener('scroll', surDefilement);
      window.removeEventListener('resize', surDefilement);
    };
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-[opacity,transform] duration-[var(--duration-base)] ease-[var(--ease-out)] sm:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
      // Retire de l'ordre de lecture tant qu'elle est invisible : une barre
      // transparente reste tabulable, et le clavier s'y perd.
      aria-hidden={!visible}
    >
      <a
        href={purchaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={visible ? undefined : -1}
        className="flex h-[54px] w-full items-center justify-between gap-3 rounded-[16px] bg-[color:var(--color-night)] pl-5 pr-2 text-white shadow-[0_8px_28px_rgb(11_22_63_/_0.28)]"
      >
        <span className="text-[15px] font-semibold">
          Accès à vie · <span className="whitespace-nowrap">{prix}</span>
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12h13m0 0-5-5m5 5-5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </a>
    </div>
  );
}
