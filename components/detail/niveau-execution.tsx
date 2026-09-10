import type { Niveau } from '@/lib/catalog/niveau';

/**
 * Ce que la commande fera avant de produire.
 *
 * La fiche disait deja ce qu'il faut fournir et ce qu'on recoit ; entre les
 * deux manquait la seule chose qui distingue vraiment deux commandes
 * voisines : est-ce que celle-ci rend un resultat tout de suite, ou est-ce
 * qu'elle va d'abord poser des questions et conduire un travail ?
 *
 * Formule comme une attente, jamais comme une promesse chiffree : la commande
 * relit d'abord ce qu'on lui a donne et ne demande que ce qui manque.
 */
export function NiveauExecution({ niveau }: { niveau: Niveau }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] px-3 py-2.5">
      <span aria-hidden="true" className="mt-[0.15em] shrink-0 text-[color:var(--color-brand)]">
        {niveau.mission ? <IconeMission /> : <IconeDirect />}
      </span>

      <span className="flex flex-col gap-0.5">
        <span className="text-[length:var(--texte-carte)] font-semibold text-[color:var(--color-night)]">
          {niveau.titre}
        </span>
        {niveau.attente ? (
          <span className="text-[length:var(--texte-meta)] leading-[1.4] text-[color:var(--color-muted)]">
            {niveau.attente}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/** Une fleche qui va droit au but. */
function IconeDirect() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h13m0 0-5-5m5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Des etapes qui s'enchainent. */
function IconeMission() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="7" r="2.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="17" r="2.2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M6 9.5v4A3.5 3.5 0 0 0 9.5 17H15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
