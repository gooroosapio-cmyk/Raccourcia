'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import type { PromptCard } from '@/lib/catalog/types';

type Etat = 'repos' | 'chargement' | 'copie';

/** Refus venant du serveur : il porte deja un message pour l'utilisateur. */
class ErreurCopie extends Error {}

type Lecture = { payload: string; versionId: string };

/**
 * Demande le texte complet. La route revalide les droits a chaque appel et
 * n'inscrit rien : lire n'est pas copier.
 */
function lireLaCommande(corps: {
  promptId: string;
  surface: string;
  champs?: { cle: string; valeur: string }[];
}): Promise<Lecture> {
  return fetch('/api/resolve-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
    cache: 'no-store',
  }).then(async (response) => {
    const data = (await response.json().catch(() => ({}))) as {
      payload?: string;
      versionId?: string;
      error?: string;
    };
    if (!response.ok || !data.payload || !data.versionId) {
      throw new ErreurCopie(data.error ?? 'Copie impossible. Réessayez.');
    }
    return { payload: data.payload, versionId: data.versionId };
  });
}

/**
 * Annonce une copie reussie. Jamais le texte, jamais les champs.
 *
 * `keepalive` : le membre part souvent coller aussitot, et l'onglet peut
 * passer en arriere-plan avant la reponse. L'echec est silencieux — la
 * copie, elle, a eu lieu.
 */
function annoncerLaCopie(corps: { promptId: string; versionId: string; surface: string }) {
  void fetch('/api/copie-reussie', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
    keepalive: true,
  }).catch(() => {});
}

/**
 * Ecrit dans le presse-papiers sans perdre l'autorisation du navigateur.
 *
 * Safari n'accorde ce droit que pendant la tache issue du clic. Attendre la
 * reponse du serveur avant d'appeler `writeText` la consomme, et l'appel est
 * refuse. `ClipboardItem` accepte une promesse comme valeur, precisement pour
 * ce cas : l'appel part dans le geste, le contenu arrive apres. Le repli par
 * `writeText` sert aux navigateurs qui n'acceptent pas de promesse.
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
 * Le bouton « Copier le prompt ».
 *
 * UN SEUL TEXTE, UN SEUL LIBELLE. La commande porte un texte unique, copie
 * tel quel quelle que soit l'IA du membre : le bouton ne nomme aucune IA et
 * n'en ouvre aucune apres la copie. Copier copie, et s'arrete la.
 *
 * LE SUCCES N'EST ANNONCE QU'APRES L'ECRITURE. « Prompt copié » n'apparait
 * que si le presse-papiers a accepte le texte ; c'est seulement alors que la
 * copie est inscrite a l'historique. Si le navigateur refuse, le texte
 * s'ouvre dans un panneau ou il peut etre selectionne a la main — et une
 * copie faite ainsi s'inscrit aussi, au moment ou elle a lieu.
 *
 * UN TOUCHER, UNE COPIE. Tant qu'une copie est en cours, un second toucher
 * ne part pas ; la base ignore en plus un doublon dans les dix secondes.
 */
export function CopyCommandButton({
  promptId,
  surface,
  locked = false,
  pret = true,
  genre = null,
  champs,
  verifierAvantCopie,
  onLockedClick,
}: {
  promptId: string;
  surface: 'carte' | 'detail' | 'page-publique';
  locked?: boolean;
  /**
   * Faux quand la commande n'a pas encore son texte : le bouton ne promet
   * rien qu'il ne puisse tenir.
   */
  pret?: boolean;
  /** Le genre de la commande : le message apres copie dit quoi faire ensuite. */
  genre?: PromptCard['entityType'];
  /**
   * Ce qui a ete saisi dans le formulaire de la fiche. Transmis tel quel :
   * le serveur relit les champs declares et ignore le reste.
   */
  champs?: { cle: string; valeur: string }[];
  /**
   * Appelee avant toute copie ; `false` l'arrete. La fiche s'en sert pour
   * un champ indispensable laisse vide : elle affiche l'erreur sous le champ
   * et y place le focus. Synchrone, pour rester dans le geste du clic.
   */
  verifierAvantCopie?: () => boolean;
  onLockedClick?: () => void;
}) {
  const { show } = useToast();
  const [etat, setEtat] = useState<Etat>('repos');
  const [manuel, setManuel] = useState<Lecture | null>(null);
  // Un ref et non l'etat : deux touchers dans la meme image liraient tous
  // deux l'ancien etat « repos » et partiraient tous les deux.
  const enCours = useRef(false);

  const confirmer = useCallback(() => {
    show(
      genre === 'mode_ia'
        ? 'Prompt copié. Collez-le dans votre outil d’IA, puis décrivez votre objectif.'
        : genre === 'parcours'
          ? 'Prompt copié. Collez-le dans votre outil d’IA, puis suivez les étapes.'
          : 'Prompt copié. Collez-le dans votre outil d’IA.',
    );
  }, [genre, show]);

  // Volontairement non `async` : tout ce qui precede l'ecriture dans le
  // presse-papiers doit rester dans la meme tache que le clic.
  const copier = useCallback(() => {
    if (locked) {
      onLockedClick?.();
      return;
    }
    if (!pret || enCours.current) return;
    if (verifierAvantCopie && !verifierAvantCopie()) return;
    enCours.current = true;
    setEtat('chargement');

    const lecture = lireLaCommande({ promptId, surface, champs });
    // La promesse est lue deux fois ; une seule lecture traite son rejet.
    lecture.catch(() => {});

    // Les deux doivent aboutir : un navigateur qui accepterait l'ecriture
    // sans attendre la valeur promise ferait annoncer une copie sur un refus
    // du serveur.
    Promise.all([ecrireDansLePressePapier(lecture.then((l) => l.payload)), lecture]).then(
      ([, lu]) => {
        setEtat('copie');
        confirmer();
        navigator.vibrate?.(10);
        annoncerLaCopie({ promptId, versionId: lu.versionId, surface });
        // La coche est breve : on copie souvent deux fois de suite.
        setTimeout(() => {
          setEtat('repos');
          enCours.current = false;
        }, 1400);
      },
      async () => {
        setEtat('repos');
        enCours.current = false;
        // Deux echecs tres differents : si la lecture a abouti, c'est le
        // presse-papiers qui a refuse — le texte s'ouvre alors a la main.
        try {
          const lu = await lecture;
          setManuel(lu);
        } catch (erreur) {
          show(
            erreur instanceof ErreurCopie ? erreur.message : 'Connexion interrompue. Réessayez.',
            'erreur',
          );
        }
      },
    );
  }, [champs, confirmer, locked, onLockedClick, pret, promptId, show, surface, verifierAvantCopie]);

  const libelle = locked
    ? 'Débloquer pour copier'
    : !pret
      ? 'Texte bientôt disponible'
      : etat === 'copie'
        ? 'Prompt copié'
        : 'Copier le prompt';

  const icone = locked ? (
    <LockIcon />
  ) : !pret ? (
    <HorlogeIcon />
  ) : etat === 'copie' ? (
    <CheckIcon />
  ) : (
    <CopyIcon />
  );

  const ton = locked
    ? 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]'
    : !pret
      ? 'bg-[color:var(--color-sky)] text-[color:var(--color-muted)]'
      : etat === 'copie'
        ? 'bg-[color:var(--color-success)] text-white'
        : 'bg-[color:var(--color-brand)] text-white hover:bg-[color:var(--color-brand-strong)]';

  return (
    <>
      <button
        type="button"
        onClick={copier}
        disabled={!pret && !locked}
        // Jamais desactive pendant le chargement : le bouton paraitrait
        // casse. L'etat reste annonce, et le second toucher est ignore.
        aria-busy={etat === 'chargement'}
        className={`touch-target inline-flex h-13 w-full items-center justify-center gap-2 rounded-[color:var(--radius-control)] px-4 text-[15px] font-semibold transition-[background-color,transform] duration-[var(--duration-fast)] active:scale-[0.98] disabled:cursor-not-allowed ${ton}`}
      >
        {icone}
        <span className="whitespace-nowrap">{libelle}</span>
      </button>

      {/* L'annonce du resultat pour un lecteur d'ecran : le libelle du
          bouton change, mais un changement de libelle ne se lit pas seul. */}
      <span className="sr-only" role="status" aria-live="polite">
        {etat === 'copie' ? 'Prompt copié.' : ''}
      </span>

      {manuel ? (
        <CopieManuelle
          texte={manuel.payload}
          onCopie={() => {
            confirmer();
            annoncerLaCopie({ promptId, versionId: manuel.versionId, surface });
          }}
          onFermer={() => setManuel(null)}
        />
      ) : null}
    </>
  );
}

/**
 * Le repli quand le navigateur refuse le presse-papiers.
 *
 * Le texte est la, selectionne d'avance, avec la consigne. Une copie faite
 * au clavier ou au menu declenche l'evenement `copy` du champ : c'est a ce
 * moment-la, et pas avant, qu'elle s'annonce et s'inscrit.
 */
function CopieManuelle({
  texte,
  onCopie,
  onFermer,
}: {
  texte: string;
  onCopie: () => void;
  onFermer: () => void;
}) {
  const champRef = useRef<HTMLTextAreaElement>(null);
  const dejaCopie = useRef(false);

  useEffect(() => {
    champRef.current?.focus();
    champRef.current?.select();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFermer();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onFermer]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="copie-manuelle-titre"
      className="anim-fondu fixed inset-0 z-[80] flex items-end justify-center bg-[color:var(--color-night)]/60 p-4 sm:items-center"
    >
      <div className="w-full max-w-lg rounded-[var(--radius-card)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
        <h2
          id="copie-manuelle-titre"
          className="text-[length:var(--texte-titre-carte)] font-semibold text-[color:var(--color-night)]"
        >
          Copiez le prompt à la main
        </h2>
        <p className="mt-1 text-[length:var(--texte-meta)] leading-relaxed text-[color:var(--color-muted)]">
          Votre navigateur a bloqué la copie automatique. Le texte est sélectionné : appuyez
          longuement dessus puis choisissez « Copier ».
        </p>
        <textarea
          ref={champRef}
          readOnly
          value={texte}
          onCopy={() => {
            if (dejaCopie.current) return;
            dejaCopie.current = true;
            onCopie();
          }}
          rows={8}
          className="mt-3 w-full resize-none rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] p-3 font-mono text-[13px] leading-relaxed text-[color:var(--color-night)]"
        />
        <button
          type="button"
          onClick={onFermer}
          className="touch-target mt-3 inline-flex h-11 w-full items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-sky)] text-[15px] font-semibold text-[color:var(--color-night)]"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

/** Le texte n'est pas encore la. */
function HorlogeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 13 4 4L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
