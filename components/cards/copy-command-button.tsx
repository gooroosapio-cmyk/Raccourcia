'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { PROVIDER_LABELS, PROVIDER_URLS, type ProviderKey } from '@/lib/constants';

type Etat = 'repos' | 'chargement' | 'copie';

/** Refus venant du serveur : il porte deja un message pour l'utilisateur. */
class ErreurCopie extends Error {}

/** Demande le contenu complet. La route revalide les droits a chaque appel. */
function demanderLaCommande(corps: {
  promptId: string;
  provider: string;
  surface: string;
}): Promise<string> {
  return fetch('/api/resolve-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
    cache: 'no-store',
  }).then(async (response) => {
    const data = (await response.json().catch(() => ({}))) as {
      payload?: string;
      error?: string;
    };
    if (!response.ok || !data.payload) {
      throw new ErreurCopie(data.error ?? 'Copie impossible. Réessayez.');
    }
    return data.payload;
  });
}

/**
 * Ecrit dans le presse-papiers sans perdre l'autorisation du navigateur.
 *
 * Safari n'accorde ce droit que pendant la tache issue du clic. Attendre la
 * reponse du serveur avant d'appeler `writeText` la consomme, et l'appel est
 * refuse : sur iPhone, toute copie echouait, membre ou visiteur, alors que la
 * route repondait 200. C'est la cause du « Copie impossible » signale.
 *
 * `ClipboardItem` accepte une promesse comme valeur, precisement pour ce cas :
 * l'appel part dans le geste, le contenu arrive apres. Le repli par
 * `writeText` sert aux navigateurs qui n'acceptent pas de promesse — ils ne
 * demandent pas le geste avec la meme severite.
 */
function ecrireDansLePressePapier(texte: Promise<string>): Promise<void> {
  const repli = () => texte.then((valeur) => navigator.clipboard.writeText(valeur));

  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return repli();

  try {
    const item = new ClipboardItem({
      'text/plain': texte.then((valeur) => new Blob([valeur], { type: 'text/plain' })),
    });
    return navigator.clipboard.write([item]).catch(repli);
  } catch {
    // Certains navigateurs refusent une promesse a la construction.
    return repli();
  }
}

/**
 * Bouton de copie d'une commande.
 *
 * L'interface parle de commande, jamais de prompt : le contenu complet n'est
 * ni affiche, ni precharge, ni nomme. Il est demande au clic a une route qui
 * revalide les droits, puis pose directement dans le presse-papiers.
 *
 * Le message de retour est "Commande copiee" : ce que l'utilisateur vient
 * d'obtenir est une commande prete a coller, la mecanique interne ne le
 * regarde pas.
 */
export function CopyCommandButton({
  promptId,
  provider,
  surface,
  locked = false,
  compact = false,
  onLockedClick,
  proposerOuverture = false,
}: {
  promptId: string;
  provider: string;
  surface: 'carte' | 'detail' | 'page-publique';
  locked?: boolean;
  /** Variante des cartes : le libelle se reduit a "Copier". */
  compact?: boolean;
  onLockedClick?: () => void;
  /**
   * Propose d'ouvrir l'IA choisie une fois la commande copiee.
   *
   * Reserve a la fiche : sur une carte, la place manque et l'utilisateur
   * copie souvent plusieurs commandes de suite avant d'aller les coller.
   */
  proposerOuverture?: boolean;
}) {
  const { show } = useToast();
  const [etat, setEtat] = useState<Etat>('repos');
  const [ouvertureProposee, setOuvertureProposee] = useState(false);

  // Volontairement non `async` : tout ce qui precede l'ecriture dans le
  // presse-papiers doit rester dans la meme tache que le clic. Voir
  // `ecrireDansLePressePapier`.
  const copier = useCallback(() => {
    if (locked) {
      onLockedClick?.();
      return;
    }

    setEtat('chargement');

    const texte = demanderLaCommande({ promptId, provider, surface });
    // Sans ce filet, un refus du serveur remonterait aussi comme rejet non
    // gere : la promesse est lue deux fois, une seule lecture la traite.
    texte.catch(() => {});

    // Les deux doivent aboutir. Le presse-papiers seul ne suffit pas : un
    // navigateur qui accepte l'ecriture sans attendre la valeur promise ferait
    // annoncer « Commande copiee » sur un refus du serveur.
    Promise.all([ecrireDansLePressePapier(texte), texte]).then(
      () => {
        setEtat('copie');
        show('Commande copiée');
        setOuvertureProposee(proposerOuverture);
        navigator.vibrate?.(10);
        // La coche est une confirmation breve : le bouton doit redevenir
        // utilisable tout de suite, on copie souvent deux fois de suite.
        setTimeout(() => setEtat('repos'), 1400);
      },
      async () => {
        setEtat('repos');
        // Deux echecs tres differents arrivaient sous le meme message. On
        // relit la demande pour savoir lequel : si elle a abouti, c'est le
        // presse-papiers qui a refuse, et reessayer n'y changera rien.
        try {
          await texte;
          show('Votre navigateur a refusé l’accès au presse-papiers.', 'erreur');
        } catch (erreur) {
          show(
            erreur instanceof ErreurCopie ? erreur.message : 'Connexion interrompue. Réessayez.',
            'erreur',
          );
        }
      },
    );
  }, [locked, onLockedClick, promptId, proposerOuverture, provider, show, surface]);

  const libelle = locked
    ? compact
      ? 'Débloquer'
      : 'Débloquer pour copier'
    : etat === 'copie'
      ? 'Copie'
      : compact
        ? 'Copier'
        : 'Copier la commande';

  const ton = locked
    ? 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]'
    : etat === 'copie'
      ? 'bg-[color:var(--color-success)] text-white'
      : 'bg-[color:var(--color-brand)] text-white hover:bg-[color:var(--color-brand-strong)]';

  const cle = provider as ProviderKey;
  const adresse = PROVIDER_URLS[cle];

  return (
    <>
      <button
        type="button"
        onClick={copier}
        // Jamais desactive pendant le chargement : la largeur resterait la meme
        // mais le bouton paraitrait casse. On garde l'etat visible a la place.
        aria-busy={etat === 'chargement'}
        aria-label={
          locked ? 'Débloquer RaccourcIA pour copier cette commande' : 'Copier la commande'
        }
        className={`touch-target inline-flex w-full items-center justify-center gap-1.5 rounded-[color:var(--radius-control)] font-semibold transition-[background-color,transform] duration-[var(--duration-fast)] active:scale-[0.98] ${
          compact ? 'h-11 px-3 text-[13px]' : 'h-13 px-4 text-[15px]'
        } ${ton}`}
      >
        {locked ? <LockIcon /> : etat === 'copie' ? <CheckIcon /> : <CopyIcon />}
        <span className="truncate">{libelle}</span>
      </button>

      {/* Action secondaire, discrete et seulement une fois la copie faite :
          proposer d'ouvrir l'IA avant qu'il y ait quelque chose a coller
          n'aurait servi qu'a faire quitter la page. Le lien ne porte aucune
          donnee — la commande est dans le presse-papiers, pas dans l'URL. */}
      {ouvertureProposee && adresse ? (
        <a
          href={adresse}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOuvertureProposee(false)}
          className="touch-target mt-2 flex w-full items-center justify-center gap-1.5 rounded-[color:var(--radius-control)] text-[length:var(--texte-carte)] font-medium text-[color:var(--color-brand)]"
        >
          Ouvrir {PROVIDER_LABELS[cle]}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M14 5h5v5M19 5l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      ) : null}
    </>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 15V5a2 2 0 0 1 2-2h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 13 4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
