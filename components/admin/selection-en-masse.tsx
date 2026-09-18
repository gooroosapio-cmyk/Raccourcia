'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { appliquerEnMasse } from '@/lib/actions/admin';
import { AdminFeedback } from '@/components/ui/admin-form';
import type { AdminActionState } from '@/lib/actions/admin';

/**
 * La selection multiple de la liste d'administration.
 *
 * A quelques centaines de raccourcis, ouvrir chaque fiche pour la publier
 * tient encore. A plusieurs milliers, c'est ce qui empeche de travailler :
 * une vague d'import arrive en brouillon, et il faut cinquante gestes pour
 * la mettre en ligne.
 *
 * La selection est un simple formulaire : les cases sont des `input` nommes,
 * le navigateur les rassemble, et l'action recoit la liste. Rien n'est garde
 * dans un etat React — donc rien a resynchroniser quand la page change, et
 * la selection fonctionne meme si le script n'a pas charge. Le compteur et
 * la confirmation, eux, ont besoin du navigateur : ils lisent le formulaire
 * a chaque changement plutot que de suivre chaque case.
 *
 * Archiver demande une confirmation. C'est le seul geste de la barre qui
 * retire quelque chose de la vue des membres, et il peut en retirer deux
 * cents d'un coup : le faire d'un clic distrait serait trop facile.
 */
export function SelectionEnMasse({ children }: { children: ReactNode }) {
  const [state, action, enCours] = useActionState<AdminActionState, FormData>(appliquerEnMasse, {});
  const [choisis, setChoisis] = useState(0);
  const [confirmeArchivage, setConfirmeArchivage] = useState(false);

  const recompter = (formulaire: HTMLFormElement) => {
    setChoisis(new FormData(formulaire).getAll('ids').length);
    // Changer la selection annule une confirmation en attente : elle portait
    // sur un ensemble qui n'existe plus.
    setConfirmeArchivage(false);
  };

  return (
    <form
      action={action}
      onChange={(evenement) => recompter(evenement.currentTarget)}
      className="space-y-3"
    >
      {children}

      <AdminFeedback state={state} />

      {/* La barre colle au bas de l'ecran : une selection faite en haut d'une
          liste de vingt-cinq lignes ne doit pas obliger a redescendre pour
          agir dessus. */}
      <div className="sticky bottom-2 z-10 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-2.5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto text-sm font-medium text-[color:var(--color-night)]">
            {choisis === 0
              ? 'Cochez des raccourcis pour agir dessus'
              : `${choisis} sélectionné${choisis > 1 ? 's' : ''}`}
          </span>

          <Geste operation="publier" libelle="Publier" desactive={choisis === 0 || enCours} />
          <Geste operation="brouillon" libelle="Brouillon" desactive={choisis === 0 || enCours} />
          <Geste operation="offrir" libelle="Offrir" desactive={choisis === 0 || enCours} />
          <Geste operation="reserver" libelle="Réserver" desactive={choisis === 0 || enCours} />

          {confirmeArchivage ? (
            <Geste
              operation="archiver"
              libelle={`Confirmer l’archivage de ${choisis}`}
              desactive={choisis === 0 || enCours}
              ton="danger"
            />
          ) : (
            <button
              type="button"
              onClick={() => setConfirmeArchivage(true)}
              disabled={choisis === 0 || enCours}
              className="inline-flex h-10 items-center rounded-[color:var(--radius-control)] border border-[color:var(--color-danger)]/40 px-3 text-sm font-medium text-[color:var(--color-danger)] disabled:opacity-40"
            >
              Archiver…
            </button>
          )}
        </div>

        {confirmeArchivage ? (
          <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
            L’archivage retire ces raccourcis de la vue des membres. Rien n’est supprimé : ils se
            republient d’un geste.
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Geste({
  operation,
  libelle,
  desactive,
  ton,
}: {
  operation: string;
  libelle: string;
  desactive: boolean;
  ton?: 'danger';
}) {
  return (
    <button
      type="submit"
      name="operation"
      value={operation}
      disabled={desactive}
      className={`inline-flex h-10 items-center rounded-[color:var(--radius-control)] px-3 text-sm font-medium disabled:opacity-40 ${
        ton === 'danger'
          ? 'bg-[color:var(--color-danger)] text-white'
          : 'border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-night)]'
      }`}
    >
      {libelle}
    </button>
  );
}

/**
 * La case d'une ligne.
 *
 * Elle porte le nom du raccourci pour la lecture vocale : vingt-cinq cases
 * intitulees « Sélectionner » ne disent pas laquelle on coche.
 */
export function CaseDeSelection({ id, nom }: { id: string; nom: string }) {
  return (
    <input
      type="checkbox"
      name="ids"
      value={id}
      aria-label={`Sélectionner ${nom}`}
      className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--color-brand)]"
    />
  );
}
