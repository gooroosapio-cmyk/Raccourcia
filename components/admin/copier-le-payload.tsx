'use client';

import { useCallback, useState } from 'react';

import { lireLePayloadAdmin } from '@/lib/actions/admin';
import { useToast } from '@/components/ui/toast';

/**
 * Copier le texte d'une commande depuis la liste, sans ouvrir la fiche.
 *
 * LE TRAJET QU'IL SUPPRIME. Verifier un payload demandait d'ouvrir la
 * fiche, de descendre jusqu'au formulaire de version, de selectionner le
 * texte dans une zone de saisie, puis de revenir — en perdant sa place
 * dans une liste de mille cinq cents entrees. Sur une seance de relecture,
 * c'est le trajet refait a chaque carte.
 *
 * LE GESTE DOIT RESTER DANS LA TACHE DU CLIC. Safari n'accorde le droit
 * d'ecrire dans le presse-papiers que pendant la tache issue du clic :
 * attendre la reponse du serveur avant `writeText` consomme ce droit et
 * l'appel est refuse. `ClipboardItem` accepte une promesse comme valeur,
 * precisement pour ce cas — c'est la meme mecanique que le bouton de copie
 * cote membre, pour la meme raison.
 */
export function CopierLePayload({ promptId }: { promptId: string }) {
  const { show } = useToast();
  const [etat, setEtat] = useState<'repos' | 'copie'>('repos');

  // Volontairement non `async` : tout ce qui precede l'ecriture doit rester
  // dans la tache du clic.
  const copier = useCallback(() => {
    const texte = lireLePayloadAdmin(promptId).then((reponse) => {
      if ('error' in reponse) throw new Error(reponse.error);
      return reponse;
    });

    // La promesse est lue deux fois : sans ce filet, un refus remonterait
    // aussi comme rejet non gere.
    texte.catch(() => {});

    const contenu = texte.then((reponse) => reponse.payload);
    const ecriture =
      typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write
        ? contenu.then((valeur) => navigator.clipboard.writeText(valeur))
        : navigator.clipboard
            .write([
              new ClipboardItem({
                'text/plain': contenu.then((valeur) => new Blob([valeur], { type: 'text/plain' })),
              }),
            ])
            .catch(() => contenu.then((valeur) => navigator.clipboard.writeText(valeur)));

    Promise.all([ecriture, texte]).then(
      ([, reponse]) => {
        setEtat('copie');
        show(`Texte ${reponse.ia} copié.`);
        navigator.vibrate?.(10);
        setTimeout(() => setEtat('repos'), 1400);
      },
      async () => {
        // Deux echecs tres differents arrivaient sous le meme message : on
        // relit la demande pour savoir lequel.
        try {
          await texte;
          show('Votre navigateur a refusé l’accès au presse-papiers.', 'erreur');
        } catch (erreur) {
          show(erreur instanceof Error ? erreur.message : 'Copie impossible.', 'erreur');
        }
      },
    );
  }, [promptId, show]);

  return (
    <button
      type="button"
      onClick={copier}
      title="Copier le texte de la commande"
      aria-label="Copier le texte de la commande"
      className={`touch-target flex items-center justify-center rounded-[color:var(--radius-control)] transition-colors duration-[var(--duration-fast)] ${
        etat === 'copie'
          ? 'text-[color:var(--color-success)]'
          : 'text-[color:var(--color-line-strong)] active:text-[color:var(--color-brand)]'
      }`}
    >
      {etat === 'copie' ? (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="m5 13 4 4L19 7"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect
            x="9"
            y="9"
            width="11"
            height="11"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M5 15V5a2 2 0 0 1 2-2h10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
