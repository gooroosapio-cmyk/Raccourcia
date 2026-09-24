'use client';

import { useState, useTransition } from 'react';
import { showToast } from '@/components/ui/toast';
import { toggleFavorite } from '@/lib/actions/catalog';

/**
 * Le coeur : le favori prive d'une commande.
 *
 * UN SEUL GESTE, ET IL EST PRIVE. Deux icones vivaient cote a cote : une
 * etoile pour ranger la commande chez soi, un coeur pour dire publiquement
 * qu'elle sert, avec son compteur. Le « j'aime » public a ete retire
 * (decision de cadrage 4B) ; le coeur reprend le seul sens qui reste,
 * celui que tout le monde lui prete deja : « je la garde ». Aucun compte ne
 * s'affiche, personne d'autre ne voit ce qu'un membre a mis de cote.
 *
 * L'ETAT BASCULE AVANT LA REPONSE DU SERVEUR. Un coeur qui attend un
 * aller-retour donne l'impression de ne pas avoir compris le geste. Il
 * revient en arriere si l'ecriture echoue, et le dit.
 *
 * UN VISITEUR PEUT TOUCHER LE COEUR. Il n'a pas de favoris, mais un bouton
 * grise ne dit pas pourquoi : le toucher explique qu'il faut se connecter.
 *
 * Cible tactile de 44 px, meme quand l'icone est plus petite.
 */
export function FavoriteButton({
  promptId,
  initial,
  disabled = false,
  visiteur = false,
  sur = false,
  surVisuel = false,
}: {
  promptId: string;
  initial: boolean;
  disabled?: boolean;
  visiteur?: boolean;
  /**
   * Vrai quand le bouton est pose sur le coin d'une vignette : un coeur au
   * trait fin s'y perdrait sur un fond clair comme sur un fond charge. Une
   * pastille translucide le detache sans masquer le visuel.
   */
  sur?: boolean;
  /** Vrai sur une image plein ecran (Decouvrir) : plus grand, en blanc. */
  surVisuel?: boolean;
}) {
  const [isFavorite, setIsFavorite] = useState(initial);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    if (visiteur) {
      showToast('Connectez-vous pour garder vos commandes en favori.', 'erreur');
      return;
    }
    if (disabled) return;
    const next = !isFavorite;
    setIsFavorite(next);

    startTransition(async () => {
      const result = await toggleFavorite(promptId);
      if ('error' in result) {
        setIsFavorite(!next);
        showToast('Votre favori n’a pas été enregistré.', 'erreur');
      } else setIsFavorite(result.isFavorite);
    });
  };

  const taille = surVisuel ? 28 : 20;

  return (
    <button
      type="button"
      onClick={toggle}
      // Un visiteur garde un bouton actif : c'est le toucher qui explique.
      disabled={!visiteur && (disabled || pending)}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Retirer de mes favoris' : 'Ajouter à mes favoris'}
      className={`touch-target inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-[var(--duration-fast)] disabled:opacity-50 ${
        surVisuel ? 'text-white' : 'text-[color:var(--color-muted)]'
      }`}
    >
      <span
        className={
          sur
            ? 'flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-surface)]/85 shadow-[var(--shadow-card)] backdrop-blur-[2px]'
            : 'contents'
        }
      >
        <svg width={taille} height={taille} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 0 1 19.4 13Z"
            fill={isFavorite ? (surVisuel ? 'currentColor' : 'var(--color-brand)') : 'none'}
            stroke={isFavorite && !surVisuel ? 'var(--color-brand)' : 'currentColor'}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
