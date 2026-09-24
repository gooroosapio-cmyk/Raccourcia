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
 *
 * LA BARRE N'APPARAIT QU'APRES UNE SELECTION (rapport de refonte, p. 11) :
 * au repos, elle couvrait le bas de la liste pour rien. Visible, elle
 * reserve sa place sous la liste. Sa PORTEE est toujours dite : « cette
 * page » ou « les N resultats filtres » — ces derniers quand le filtre en
 * retient au plus deux cents, la borne d'un geste groupe.
 */
export function SelectionEnMasse({
  children,
  tousLesIds = [],
}: {
  children: ReactNode;
  /** Les identifiants de tous les resultats filtres, quand ils sont <= 200. */
  tousLesIds?: string[];
}) {
  const [state, action, enCours] = useActionState<AdminActionState, FormData>(appliquerEnMasse, {});
  const [choisis, setChoisis] = useState(0);
  const [tous, setTous] = useState(false);
  const [confirmeArchivage, setConfirmeArchivage] = useState(false);

  const recompter = (formulaire: HTMLFormElement) => {
    setChoisis(new FormData(formulaire).getAll('ids').length - (tous ? tousLesIds.length : 0));
    // Changer la selection annule une confirmation en attente : elle portait
    // sur un ensemble qui n'existe plus.
    setConfirmeArchivage(false);
  };

  const portee = tous ? tousLesIds.length : choisis;
  const visible = portee > 0;

  return (
    <form
      action={action}
      onChange={(evenement) => recompter(evenement.currentTarget)}
      className="space-y-3"
    >
      {tousLesIds.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            setTous((valeur) => !valeur);
            setConfirmeArchivage(false);
          }}
          aria-pressed={tous}
          className="touch-target inline-flex items-center text-[13px] font-medium text-[color:var(--color-brand)] underline underline-offset-2"
        >
          {tous
            ? 'Revenir à la sélection de cette page'
            : `Sélectionner les ${tousLesIds.length} résultats filtrés`}
        </button>
      ) : null}

      {/* Une portee etendue : chaque identifiant part en champ cache. Les cases
          de la page restent, sans effet de plus — la base ignore un doublon. */}
      {tous ? tousLesIds.map((id) => <input key={id} type="hidden" name="ids" value={id} />) : null}

      {children}

      <AdminFeedback state={state} />

      {/* Visible seulement apres une selection, et collee au bas de l'ecran :
          une selection faite en haut d'une liste ne doit pas obliger a
          redescendre pour agir dessus. */}
      {visible ? (
        <div className="sticky bottom-2 z-10 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-2.5 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-auto text-sm font-medium text-[color:var(--color-night)]">
              {tous
                ? `Portée : les ${portee} résultats filtrés`
                : `Portée : ${portee} sélectionné${portee > 1 ? 's' : ''} sur cette page`}
            </span>

            <Geste operation="publier" libelle="Publier" desactive={enCours} />
            <Geste operation="brouillon" libelle="Brouillon" desactive={enCours} />
            <Geste operation="offrir" libelle="Offrir" desactive={enCours} />
            <Geste operation="reserver" libelle="Réserver" desactive={enCours} />

            {confirmeArchivage ? (
              <Geste
                operation="archiver"
                libelle={`Confirmer l’archivage de ${portee}`}
                desactive={enCours}
                ton="danger"
              />
            ) : (
              <button
                type="button"
                onClick={() => setConfirmeArchivage(true)}
                disabled={enCours}
                className="inline-flex h-11 items-center rounded-[color:var(--radius-control)] border border-[color:var(--color-danger)]/40 px-3 text-sm font-medium text-[color:var(--color-danger)] disabled:opacity-40"
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
      ) : null}
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
      className={`inline-flex h-11 items-center rounded-[color:var(--radius-control)] px-3 text-sm font-medium disabled:opacity-40 ${
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
    // La case garde son dessin, sa zone de toucher fait 44 px.
    <label className="-ml-2.5 -mt-1.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        name="ids"
        value={id}
        aria-label={`Sélectionner ${nom}`}
        className="h-5 w-5 accent-[color:var(--color-brand)]"
      />
    </label>
  );
}
