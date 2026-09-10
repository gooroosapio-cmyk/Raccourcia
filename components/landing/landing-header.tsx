'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/landing/button';

/**
 * En-tete de la page de vente.
 *
 * Fixe et compact : sur une page longue, l'action d'achat ne doit jamais etre
 * a plus d'un regard. Sur telephone, elle se reduit au logo et a un menu — le
 * bouton d'achat, lui, vit dans la barre basse, la ou le pouce se pose.
 *
 * Le menu est un panneau deroulant et non une couche plein ecran : trois
 * liens ne justifient pas de masquer la page qu'on est en train de lire.
 */
const LIENS = [
  { href: '#bibliotheque', libelle: 'Découvrir' },
  { href: '#fonctionnement', libelle: 'Comment ça marche' },
  { href: '#offre', libelle: 'Offre' },
];

export function LandingHeader({ purchaseUrl, prix }: { purchaseUrl: string; prix: string }) {
  const [ouvert, setOuvert] = useState(false);

  // Un menu ouvert qui survit au changement d'ancre resterait affiche par
  // dessus la section qu'il vient de faire atteindre.
  useEffect(() => {
    if (!ouvert) return;
    const fermer = () => setOuvert(false);
    window.addEventListener('hashchange', fermer);
    return () => window.removeEventListener('hashchange', fermer);
  }, [ouvert]);

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)]/92 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <a
          href="#haut"
          aria-label="RaccourcIA, haut de page"
          className="touch-target -ml-1 flex shrink-0 items-center px-1"
        >
          <Image
            src="/landing/logo-raccourcia.webp"
            alt="RaccourcIA"
            width={577}
            height={129}
            priority
            className="h-7 w-auto sm:h-8"
          />
        </a>

        <nav aria-label="Sections de la page" className="hidden items-center gap-6 lg:flex">
          {LIENS.map((lien) => (
            <a
              key={lien.href}
              href={lien.href}
              className="flex h-11 items-center text-[15px] font-medium text-[color:var(--color-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--color-night)]"
            >
              {lien.libelle}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Button href="/app" ton="contour" taille="compacte">
            Découvrir les commandes
          </Button>
          <Button href={purchaseUrl} externe taille="compacte">
            Passer en Premium
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOuvert((etat) => !etat)}
          aria-expanded={ouvert}
          aria-controls="menu-landing"
          aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
          className="touch-target -mr-2 inline-flex items-center justify-center rounded-[color:var(--radius-control)] text-[color:var(--color-night)] sm:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {ouvert ? (
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {ouvert ? (
        <div
          id="menu-landing"
          className="anim-apparition border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 pb-4 pt-2 sm:hidden"
        >
          <nav aria-label="Sections de la page" className="flex flex-col">
            {LIENS.map((lien) => (
              <a
                key={lien.href}
                href={lien.href}
                onClick={() => setOuvert(false)}
                className="flex min-h-[48px] items-center border-b border-[color:var(--color-line)] text-[15px] font-medium text-[color:var(--color-night)]"
              >
                {lien.libelle}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <Button href="/app" ton="contour" pleineLargeur>
              Découvrir les commandes
            </Button>
            <Button href={purchaseUrl} externe pleineLargeur>
              Passer en Premium — {prix}
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
