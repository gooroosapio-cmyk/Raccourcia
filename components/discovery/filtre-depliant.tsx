'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LIBRARY_LABELS, type Library } from '@/lib/constants';
import type { FacettesAccueil } from '@/lib/catalog/filtres';

/**
 * Le filtre de l'accueil : replie par defaut, quatre facettes dedans.
 *
 * Il remplace la barre de recherche. Une barre de recherche demande de
 * savoir quoi taper — c'est la bonne porte quand on cherche une commande
 * qu'on connait deja, et une impasse quand on vient voir ce qu'il y a. Le
 * catalogue compte six cents commandes rangees en rayons, en tags et en
 * bibliotheques : montrer ces entrees fait plus pour trouver que demander un
 * mot.
 *
 * Replie, il tient sur une ligne. Deplie, il tient dans l'ecran sans le
 * quitter : ce n'est pas un panneau modal, la liste reste dessous et se
 * met a jour a chaque geste. On voit donc ce que chaque choix fait, au lieu
 * de valider a l'aveugle puis de revenir.
 *
 * Tout passe par l'URL : la selection est partageable, le retour arriere
 * fonctionne, et fermer une fiche ne la perd pas.
 */

/** Ce que l'URL porte. Les tags sont multiples, le reste est unique. */
export type SelectionAccueil = {
  library?: Library;
  categorie?: string;
  tags: string[];
  recherche?: string;
};

/** Cinq au plus : au-dela, le croisement ne rend plus jamais rien. */
const TAGS_MAX = 5;

export function FiltreDepliant({
  facettes,
  selection,
  resultats,
}: {
  facettes: FacettesAccueil;
  selection: SelectionAccueil;
  /**
   * Le nombre reel de commandes de la selection. `null` sur l'accueil
   * d'arrivee, ou rien n'est filtre et ou annoncer un total reviendrait a
   * compter le catalogue entier pour ne rien apprendre.
   */
  resultats: number | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [terme, setTerme] = useState(selection.recherche ?? '');
  const [dernierRecu, setDernierRecu] = useState(selection.recherche ?? '');
  const [dernierEnvoye, setDernierEnvoye] = useState(selection.recherche ?? '');

  // Le champ suit une valeur venue d'ailleurs — retour navigateur, lien
  // partage, reinitialisation —, mais jamais son propre echo : la navigation
  // met quelques dizaines de millisecondes a revenir, et adopter cet echo
  // effacerait les lettres frappees entre-temps.
  const recu = selection.recherche ?? '';
  if (recu !== dernierRecu) {
    setDernierRecu(recu);
    if (recu !== dernierEnvoye) {
      setDernierEnvoye(recu);
      setTerme(recu);
    }
  }

  const pousser = useCallback(
    (suivants: URLSearchParams) => {
      // Le lot revient au premier : changer de filtre en etant descendu au
      // quatrieme palier laisse devant des cartes qu'on n'a pas fait defiler.
      suivants.delete('page');
      startTransition(() => {
        router.replace(`/app?${suivants.toString()}`, { scroll: false });
      });
    },
    [router],
  );

  // Recherche differee : la liste suit la frappe sans interroger la base a
  // chaque touche.
  useEffect(() => {
    if (recu === terme) return;
    const minuteur = setTimeout(() => {
      setDernierEnvoye(terme);
      const suivants = new URLSearchParams(params.toString());
      if (terme) suivants.set('q', terme);
      else suivants.delete('q');
      pousser(suivants);
    }, 180);
    return () => clearTimeout(minuteur);
  }, [params, pousser, recu, terme]);

  /** Un choix unique : le reprendre le retire. Se deselectionner est un geste. */
  const choisirUnique = (cle: string, valeur: string, actuelle?: string) => {
    const suivants = new URLSearchParams(params.toString());
    if (valeur === actuelle) suivants.delete(cle);
    else suivants.set(cle, valeur);

    // Les rayons appartiennent a une bibliotheque : en changer remet la
    // categorie a zero, sinon la liste se vide sans que rien ne l'explique.
    if (cle === 'bibliotheque') suivants.delete('categorie');

    pousser(suivants);
  };

  const basculerUnTag = (slug: string) => {
    const restants = selection.tags.includes(slug)
      ? selection.tags.filter((entree) => entree !== slug)
      : [...selection.tags, slug].slice(0, TAGS_MAX);

    const suivants = new URLSearchParams(params.toString());
    if (restants.length > 0) suivants.set('tags', restants.join(','));
    else suivants.delete('tags');
    pousser(suivants);
  };

  const reinitialiser = () => {
    setTerme('');
    setDernierEnvoye('');
    // Une URL neuve, et non un retrait cle par cle : « Reinitialiser » doit
    // rendre l'accueil d'arrivee, pas un accueil dont il resterait un filtre
    // oublie dans l'adresse.
    startTransition(() => router.replace('/app', { scroll: false }));
  };

  const actifs = useMemo(
    () =>
      (selection.library ? 1 : 0) +
      (selection.categorie ? 1 : 0) +
      selection.tags.length +
      (selection.recherche ? 1 : 0),
    [selection],
  );

  const plein = selection.tags.length >= TAGS_MAX;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOuvert((etat) => !etat)}
          aria-expanded={ouvert}
          aria-controls="panneau-filtres"
          className="touch-target flex min-w-0 flex-1 items-center gap-2 rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 text-[15px] font-medium text-[color:var(--color-night)]"
        >
          <IconeReglages />
          <span className="truncate">Filtrer</span>
          {actifs > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--color-brand)] px-1 text-[11px] font-semibold text-white">
              {actifs}
            </span>
          ) : null}
          <Chevron ouvert={ouvert} />
        </button>

        {actifs > 0 ? (
          <button
            type="button"
            onClick={reinitialiser}
            className="touch-target shrink-0 rounded-[color:var(--radius-control)] px-3 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-muted)] underline underline-offset-2"
          >
            Réinitialiser
          </button>
        ) : null}
      </div>

      {/* L'attribut `hidden` dit la verite aux lecteurs d'ecran, la classe
          fait le reste : une classe d'affichage l'emporterait sinon sur lui,
          et le panneau resterait visible une fois referme. */}
      <div
        id="panneau-filtres"
        hidden={!ouvert}
        className={`${ouvert ? 'block' : 'hidden'} space-y-3 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3.5`}
      >
        {facettes.bibliotheques.length > 1 ? (
          <Groupe titre="Bibliothèque">
            {facettes.bibliotheques.map((entree) => (
              <Puce
                key={entree.valeur}
                libelle={LIBRARY_LABELS[entree.valeur]}
                compte={entree.total}
                actif={selection.library === entree.valeur}
                onClick={() => choisirUnique('bibliotheque', entree.valeur, selection.library)}
              />
            ))}
          </Groupe>
        ) : null}

        {facettes.familles.length > 0 ? (
          <Groupe titre="Catégorie">
            {facettes.familles.map((famille) => (
              <Puce
                key={famille.slug}
                libelle={famille.nom}
                compte={famille.total}
                actif={selection.categorie === famille.slug}
                onClick={() => choisirUnique('categorie', famille.slug, selection.categorie)}
              />
            ))}
          </Groupe>
        ) : null}

        {facettes.tags.length > 0 ? (
          <Groupe
            titre="Tags"
            // La limite se dit avant d'etre atteinte, pas quand un geste
            // reste sans effet.
            aide={plein ? `${TAGS_MAX} tags au maximum.` : 'Plusieurs tags se cumulent.'}
          >
            {facettes.tags.map((tag) => {
              const actif = selection.tags.includes(tag.slug);
              return (
                <Puce
                  key={tag.slug}
                  libelle={tag.nom}
                  compte={tag.total}
                  actif={actif}
                  desactive={plein && !actif}
                  onClick={() => basculerUnTag(tag.slug)}
                />
              );
            })}
          </Groupe>
        ) : null}

        {/* La recherche n'a pas disparu, elle est rangee.
            L'accueil ne s'ouvre plus dessus — on y vient voir, pas taper —
            mais six cents commandes sans aucun moyen de chercher un nom
            qu'on connait deja seraient six cents commandes a faire defiler. */}
        <div>
          <label
            htmlFor="filtre-mot-cle"
            className="block text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]"
          >
            Mot-clé
          </label>
          <input
            id="filtre-mot-cle"
            type="search"
            value={terme}
            onChange={(evenement) => setTerme(evenement.target.value)}
            placeholder="Un nom, un style, un usage…"
            className="mt-1.5 h-[46px] w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] px-3.5 text-[15px] outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-brand)] focus:shadow-[0_0_0_3px_var(--color-brand-soft)]"
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[color:var(--color-line)] pt-3">
          <p
            aria-live="polite"
            className="text-[length:var(--texte-carte)] text-[color:var(--color-muted)]"
          >
            {resultats === null
              ? 'Tout le catalogue'
              : `${resultats} commande${resultats > 1 ? 's' : ''}`}
          </p>
          <button
            type="button"
            onClick={() => setOuvert(false)}
            className="touch-target rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-4 text-[15px] font-semibold text-white"
          >
            Voir
          </button>
        </div>
      </div>
    </section>
  );
}

function Groupe({
  titre,
  aide,
  children,
}: {
  titre: string;
  aide?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
        {titre}
      </h2>
      {aide ? <p className="mt-0.5 text-[12px] text-[color:var(--color-muted)]">{aide}</p> : null}
      {/* Les puces defilent horizontalement plutot que de s'empiler : un
          groupe de vingt-quatre tags replie sur quatre lignes pousserait les
          trois autres groupes hors de l'ecran. */}
      <div className="rail -mx-1 mt-1.5 px-1">
        <div className="flex w-max gap-2 pb-1">{children}</div>
      </div>
    </div>
  );
}

function Puce({
  libelle,
  compte,
  actif,
  desactive = false,
  onClick,
}: {
  libelle: string;
  compte?: number;
  actif: boolean;
  desactive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desactive}
      aria-pressed={actif}
      className={`touch-target inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[length:var(--texte-carte)] font-medium transition-colors duration-[var(--duration-fast)] disabled:opacity-40 ${
        actif
          ? 'bg-[color:var(--color-brand)] text-white'
          : 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]'
      }`}
    >
      {libelle}
      {typeof compte === 'number' ? (
        <span className={actif ? 'text-white/75' : 'text-[color:var(--color-muted)]'}>
          {compte}
        </span>
      ) : null}
    </button>
  );
}

/** Reglages et non entonnoir : sur mobile, l'entonnoir se confond avec un tri. */
function IconeReglages() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h10m4 0h2M4 12h4m4 0h8M4 17h10m4 0h2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="7" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="12" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="17" r="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function Chevron({ ouvert }: { ouvert: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`ml-auto shrink-0 transition-transform duration-[var(--duration-fast)] ${
        ouvert ? 'rotate-180' : ''
      }`}
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
