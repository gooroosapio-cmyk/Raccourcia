'use client';

import { useState } from 'react';
import { showToast } from '@/components/ui/toast';
import { basculerLeLike } from '@/lib/actions/likes';
import { compteCourt } from '@/lib/format/nombre';

/**
 * Le coeur, et son compte.
 *
 * CE QU'IL DIT, ET CE QU'IL NE DIT PAS. Un « j'aime » est public : il
 * annonce qu'une commande sert. Le favori, lui, range une commande chez
 * soi — c'est l'etoile, et les deux ne se confondent plus depuis qu'ils
 * ont deux dessins.
 *
 * IL VIT DANS TROIS ENDROITS, ET C'EST POURQUOI IL EST ICI. La galerie,
 * la fiche et Decouvrir portaient chacun leur version : trois etats
 * optimistes, trois facons de revenir en arriere, trois seuils
 * d'affichage du compte. Le jour ou l'un des trois change, les deux
 * autres mentent.
 *
 * L'ETAT BASCULE AVANT LA REPONSE DU SERVEUR. Un coeur qui attend un
 * aller-retour donne l'impression de ne pas avoir compris le geste. Il
 * revient en arriere si l'ecriture echoue, et le total affiche est alors
 * celui que la base a reellement compte.
 */
export function BoutonJaime({
  promptId,
  likeCount,
  aime: aimeAuDepart,
  visiteur = false,
  /** Vrai quand le bouton se pose sur une image plein ecran. */
  surVisuel = false,
}: {
  promptId: string;
  likeCount: number;
  aime: boolean;
  visiteur?: boolean;
  surVisuel?: boolean;
}) {
  const [aime, setAime] = useState(aimeAuDepart);
  const [total, setTotal] = useState(likeCount);
  const [envoi, setEnvoi] = useState(false);

  const basculer = () => {
    if (envoi) return;

    // Un visiteur ne peut pas aimer : la politique de la table le refuse,
    // et fabriquer un like d'appareil reviendrait a compter les
    // navigateurs plutot que les personnes.
    if (visiteur) {
      showToast('Connectez-vous pour aimer une commande.', 'erreur');
      return;
    }

    const vise = !aime;
    setAime(vise);
    setTotal((n) => Math.max(0, n + (vise ? 1 : -1)));
    setEnvoi(true);

    void basculerLeLike(promptId, vise)
      .then((etat) => {
        if (etat.ok) {
          setAime(etat.aime);
          setTotal(etat.total);
          return;
        }
        setAime(!vise);
        setTotal(likeCount);
        showToast(
          etat.raison === 'connexion'
            ? 'Connectez-vous pour aimer une commande.'
            : 'Votre « j’aime » n’a pas été enregistré.',
          'erreur',
        );
      })
      .catch(() => {
        setAime(!vise);
        setTotal(likeCount);
        showToast('Votre « j’aime » n’a pas été enregistré.', 'erreur');
      })
      .finally(() => setEnvoi(false));
  };

  return (
    <button
      type="button"
      onClick={basculer}
      aria-pressed={aime}
      aria-label={aime ? 'Retirer mon « j’aime »' : 'Aimer cette commande'}
      className={`flex min-h-[44px] min-w-[44px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full ${
        surVisuel ? 'text-white' : 'text-[color:var(--color-muted)]'
      }`}
    >
      <span
        className={
          surVisuel
            ? 'contents'
            : // Sur une carte de galerie, le coeur se pose a cote du titre
              // et non sur l'image : pas de pastille a lui donner, juste
              // assez de place pour que le pouce ne rate pas.
              'contents'
        }
      >
        <svg
          width={surVisuel ? 28 : 20}
          height={surVisuel ? 28 : 20}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 0 1 19.4 13Z"
            fill={aime ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
            className={
              aime && !surVisuel
                ? 'text-[color:var(--color-brand)] transition-transform duration-[var(--duration-fast)]'
                : 'transition-transform duration-[var(--duration-fast)]'
            }
          />
        </svg>
      </span>

      {/* LE COMPTE S'AFFICHE TOUJOURS, MEME A ZERO.
          Il ne s'affichait qu'a partir de deux — « 1 » sous un coeur ne
          dit rien d'autre que « quelqu'un a clique ». Mais une carte sur
          deux sans chiffre et l'autre avec faisait sauter la ligne du bas
          d'une carte a l'autre, et la galerie partait en escalier. Une
          hauteur constante vaut mieux qu'une ligne economisee. */}
      <span className="text-[11px] font-semibold leading-none tabular-nums">
        {compteCourt(total)}
      </span>
    </button>
  );
}
