'use client';

import { useState, useTransition } from 'react';
import { basculerLeTagFavori } from '@/lib/actions/tags-favoris';

/**
 * L'etoile qui epingle un rayon.
 *
 * CE QU'ELLE REPARE. Un membre pouvait mettre une commande en favori, pas
 * un rayon. Or on ne revient pas a la Bibliotheque pour une carte precise :
 * on y revient pour un endroit — « Portrait », « Prospection » — qu'il
 * fallait retrouver a la main a chaque visite, cinquante cartes plus bas.
 *
 * ELLE VIT A COTE DU LIEN, JAMAIS DEDANS. Un bouton place dans une ancre
 * n'est pas du HTML valide, et le lecteur d'ecran annonce alors deux
 * commandes pour une seule cible. Elle est donc posee en absolu par-dessus
 * la carte, avec sa propre zone de 44 px.
 *
 * L'ORDRE NE BOUGE PAS TOUT DE SUITE. L'etoile s'allume, la grille attend
 * la visite suivante pour remonter la carte. Une carte qui saute en tete
 * au moment ou le pouce la touche emporte avec elle ce qu'on lisait.
 */
export function EtoileDeRayon({
  slug,
  nom,
  epingleAuDepart,
  /** Vrai quand la carte porte une photo : l'etoile doit alors se voir dessus. */
  surVisuel,
}: {
  slug: string;
  nom: string;
  epingleAuDepart: boolean;
  surVisuel: boolean;
}) {
  const [epingle, setEpingle] = useState(epingleAuDepart);
  const [enCours, demarrer] = useTransition();

  return (
    <button
      type="button"
      // L'intitule dit le geste a venir, pas l'etat : un lecteur d'ecran
      // annonce « Epingler Portrait », et la reponse est le changement
      // d'intitule.
      aria-label={epingle ? `Retirer ${nom} de mes rayons` : `Épingler ${nom}`}
      aria-pressed={epingle}
      disabled={enCours}
      onClick={() => {
        // L'etoile bascule avant la reponse du serveur : sur un reseau
        // mobile, attendre rendrait le geste douteux et on le referait.
        const voulu = !epingle;
        setEpingle(voulu);
        demarrer(async () => {
          const etat = await basculerLeTagFavori(slug, voulu);
          // Refus ou panne : on remet l'etoile dans l'etat que la base
          // connait, plutot que de laisser croire que c'est enregistre.
          if (!etat.ok) setEpingle(!voulu);
        });
      }}
      className={`absolute right-1 top-1 z-10 flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-[var(--duration-fast)] active:scale-90 ${
        surVisuel ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]' : ''
      }`}
      style={surVisuel ? undefined : { color: 'var(--color-night)' }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={epingle ? 'currentColor' : 'none'}
        aria-hidden="true"
      >
        <path
          d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
