'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CLES_FILTRES,
  FilterSheet,
  type FiltresAvances,
} from '@/components/discovery/filter-sheet';
import { Intentions } from '@/components/discovery/intentions';
import { MODE_LABELS, type Mode } from '@/lib/constants';
import type { CategoryNode } from '@/lib/catalog/types';

/**
 * Zone de decouverte : recherche, filtres, modes, categories.
 *
 * Ces cinq controles agissaient jusqu'ici comme des blocs independants
 * empiles. Reunis dans une meme surface, ils se lisent comme un seul
 * instrument, et les filtres avances quittent l'ecran principal.
 *
 * Tout passe par l'URL : la position est partageable, le retour arriere
 * fonctionne, et fermer une fiche ne perd ni la recherche ni les filtres.
 */
export function DiscoveryConsole({
  modes,
  mode,
  categories,
  categorySlug,
  search,
  filtres,
  resultCount,
}: {
  modes: readonly Mode[];
  mode: Mode;
  categories: CategoryNode[];
  categorySlug?: string;
  search?: string;
  filtres: FiltresAvances;
  /** Nombre reel de resultats de la selection, pas le nombre de cartes chargees. */
  resultCount: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [terme, setTerme] = useState(search ?? '');
  const [dernierRecu, setDernierRecu] = useState(search ?? '');
  const [panneauOuvert, setPanneauOuvert] = useState(false);
  // Ce que le champ a demande en dernier. Sert a reconnaitre notre propre
  // echo quand la navigation revient. En etat et non en ref : le compilateur
  // React interdit de lire une ref pendant le rendu, et c'est bien pendant
  // le rendu que la comparaison doit avoir lieu.
  const [dernierEnvoye, setDernierEnvoye] = useState(search ?? '');

  // La recherche peut venir d'ailleurs : retour navigateur, lien partage,
  // bouton de reinitialisation. Le champ suit, sinon il continue d'afficher
  // un mot que la liste ne filtre plus. Ajuste pendant le rendu et non dans
  // un effet : un effet declencherait un second rendu, et l'ancien mot
  // clignoterait entre les deux.
  //
  // Mais seulement si la valeur ne vient pas de nous : la navigation met
  // quelques dizaines de millisecondes a revenir, et pendant ce temps on
  // continue de taper. Adopter notre propre echo effacerait les caracteres
  // frappes entre-temps — et comme le champ correspondrait alors a l'URL,
  // plus rien ne serait renvoye. La lettre etait perdue pour de bon.
  if ((search ?? '') !== dernierRecu) {
    setDernierRecu(search ?? '');
    if ((search ?? '') !== dernierEnvoye) {
      setDernierEnvoye(search ?? '');
      setTerme(search ?? '');
    }
  }

  const push = useCallback(
    (next: URLSearchParams) => {
      startTransition(() => {
        router.replace(`/app?${next.toString()}`, { scroll: false });
      });
    },
    [router],
  );

  // Recherche differee : les resultats suivent la frappe sans interroger la
  // base a chaque touche. Le delai est court — au-dela, la liste semble
  // repondre a la touche precedente.
  useEffect(() => {
    if ((search ?? '') === terme) return;
    const minuteur = setTimeout(() => {
      setDernierEnvoye(terme);
      const next = new URLSearchParams(params.toString());
      if (terme) next.set('q', terme);
      else next.delete('q');
      // Le lot revient au premier : chercher en etant descendu a la page
      // quatre n'a aucun sens, les resultats ne sont plus les memes.
      next.delete('page');
      push(next);
    }, 180);
    return () => clearTimeout(minuteur);
  }, [params, push, search, terme]);

  const choisirMode = (value: Mode) => {
    if (value === mode) return;
    const next = new URLSearchParams(params.toString());
    next.set('mode', value);
    // Les categories appartiennent a un mode : changer de mode les remet a
    // zero, comme le lot en cours.
    next.delete('categorie');
    next.delete('page');
    push(next);
  };

  // Les fleches parcourent les onglets, comme le veut le motif ARIA : sur
  // deux segments, c'est le seul moyen de passer de l'un a l'autre au clavier
  // sans quitter le groupe.
  const ongletsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const naviguerAuClavier = (evenement: React.KeyboardEvent) => {
    const pas = evenement.key === 'ArrowRight' ? 1 : evenement.key === 'ArrowLeft' ? -1 : 0;
    if (pas === 0) return;
    evenement.preventDefault();
    const index = (modes.indexOf(mode) + pas + modes.length) % modes.length;
    // Le focus suit la selection : l'onglet quitte sinon l'ordre de
    // tabulation sous le doigt de qui vient de l'atteindre, et plus aucune
    // fleche ne repond.
    ongletsRef.current[index]?.focus();
    choisirMode(modes[index]!);
  };

  const choisirCategorie = (slug?: string) => {
    const next = new URLSearchParams(params.toString());
    if (slug) next.set('categorie', slug);
    else next.delete('categorie');
    next.delete('page');
    push(next);
  };

  const appliquerFiltres = (valeurs: FiltresAvances) => {
    const next = new URLSearchParams(params.toString());
    // Parcourir les cles connues et non celles de l'objet : « Reinitialiser »
    // renvoie un objet vide, et il faut alors effacer ce qui est dans l'URL,
    // pas ce qui reste dans l'objet.
    for (const cle of CLES_FILTRES) {
      const valeur = valeurs[cle];
      if (valeur) next.set(cle, valeur);
      else next.delete(cle);
    }
    next.delete('page');
    push(next);
    setPanneauOuvert(false);
  };

  const actifs = useMemo(() => Object.values(filtres).filter(Boolean).length, [filtres]);

  const chips = categories.flatMap((parent) => [
    { slug: parent.slug, name: parent.name },
    ...parent.children.map((child) => ({ slug: child.slug, name: child.name })),
  ]);

  // Les raccourcis d'intention ne s'affichent que sur l'Accueil nu : des
  // qu'un choix est fait, la rangee de chips dit la meme chose en une ligne.
  const intentions = categories.map((famille) => ({
    slug: famille.slug,
    nom: famille.name,
  }));
  const vierge = !categorySlug && !search && actifs === 0;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <SearchField value={terme} onChange={setTerme} />
        <FilterButton count={actifs} onClick={() => setPanneauOuvert(true)} />
      </div>

      <ModeSegmentedControl
        modes={modes}
        mode={mode}
        onSelect={choisirMode}
        onKeyDown={naviguerAuClavier}
        ongletsRef={ongletsRef}
      />

      {/* L'un ou l'autre, jamais les deux : ils proposent les memes familles. */}
      {vierge ? (
        <Intentions intentions={intentions} onSelect={choisirCategorie} />
      ) : (
        <CategoryChips chips={chips} active={categorySlug} onSelect={choisirCategorie} />
      )}

      {/* Le compte disparait quand il n'y a rien : l'ecran vide le dit deja,
          et le lire deux fois de suite n'apprend rien de plus. */}
      {!vierge && resultCount > 0 ? (
        <p
          aria-live="polite"
          className="text-[length:var(--texte-carte)] text-[color:var(--color-muted)]"
        >
          {resultCount} commande{resultCount > 1 ? 's' : ''}
        </p>
      ) : null}

      {actifs > 0 ? (
        <ActiveFilterSummary
          filtres={filtres}
          onRemove={(cle) => appliquerFiltres({ ...filtres, [cle]: undefined })}
          onClear={() => appliquerFiltres({})}
        />
      ) : null}

      {panneauOuvert ? (
        <FilterSheet
          valeurs={filtres}
          resultCount={resultCount}
          onApply={appliquerFiltres}
          onClose={() => setPanneauOuvert(false)}
        />
      ) : null}
    </div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative min-w-0 flex-1">
      <span className="sr-only">Recherche une commande</span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Recherche une commande"
        // La reserve de droite n'existe que lorsque la croix d'effacement est
        // la, c'est-a-dire quand le champ est rempli : la garder a vide
        // tronquait « Recherche une commande » sur un ecran de 360 px.
        className={`h-[50px] w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] pl-11 text-[15px] outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-brand)] focus:shadow-[0_0_0_3px_var(--color-brand-soft)] ${
          value ? 'pr-10' : 'pr-3'
        }`}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Effacer la recherche"
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--color-muted)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m6 6 12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </label>
  );
}

/**
 * Bouton de filtres. Icone de reglages et non d'entonnoir : l'entonnoir est
 * ambigu sur mobile, ou il se confond avec un tri.
 */
function FilterButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count > 0 ? `Ouvrir les filtres, ${count} actifs` : 'Ouvrir les filtres'}
      className="relative flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-night)] transition-colors duration-[var(--duration-fast)] active:bg-[color:var(--color-sky)]"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--color-brand)] px-1 text-[11px] font-semibold text-white">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function ModeSegmentedControl({
  modes,
  mode,
  onSelect,
  onKeyDown,
  ongletsRef,
}: {
  modes: readonly Mode[];
  mode: Mode;
  onSelect: (mode: Mode) => void;
  onKeyDown: (evenement: React.KeyboardEvent) => void;
  ongletsRef: React.RefObject<(HTMLButtonElement | null)[]>;
}) {
  const index = Math.max(0, modes.indexOf(mode));

  return (
    <div
      role="tablist"
      aria-label="Type de commande"
      onKeyDown={onKeyDown}
      className="relative grid rounded-[color:var(--radius-control)] bg-[color:var(--color-sky)] p-1"
      style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}
    >
      {/* Le fond actif glisse d'un segment a l'autre : le lien entre le geste
          et le changement de liste se voit. */}
      <span
        aria-hidden="true"
        className="absolute bottom-1 top-1 rounded-[9px] bg-[color:var(--color-brand)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)]"
        style={{
          width: `calc((100% - 0.5rem) / ${modes.length})`,
          transform: `translateX(calc(${index} * 100%))`,
          left: '0.25rem',
        }}
      />
      {modes.map((value, index) => {
        const actif = value === mode;
        return (
          <button
            key={value}
            ref={(element) => {
              ongletsRef.current[index] = element;
            }}
            role="tab"
            type="button"
            aria-selected={actif}
            // Un seul onglet reste atteignable a la tabulation : les fleches
            // parcourent le groupe, c'est le motif attendu d'une liste
            // d'onglets.
            tabIndex={actif ? 0 : -1}
            onClick={() => onSelect(value)}
            className={`relative z-10 h-[44px] rounded-[9px] text-[length:var(--texte-corps)] font-semibold transition-colors duration-[var(--duration-fast)] ${
              actif ? 'text-white' : 'text-[color:var(--color-night)]'
            }`}
          >
            {MODE_LABELS[value]}
          </button>
        );
      })}
    </div>
  );
}

function CategoryChips({
  chips,
  active,
  onSelect,
}: {
  chips: { slug: string; name: string }[];
  active?: string;
  onSelect: (slug?: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const actifRef = useRef<HTMLButtonElement>(null);

  // La categorie choisie doit rester visible : sans cela, revenir d'une fiche
  // laisse la selection hors ecran et l'utilisateur croit l'avoir perdue.
  useEffect(() => {
    actifRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [active]);

  return (
    <div className="relative -mx-5">
      <div ref={railRef} className="rail px-5">
        <div className="flex w-max gap-2 pb-1">
          <Chip label="Toutes" active={!active} onClick={() => onSelect()} />
          {chips.map((chip) => (
            <Chip
              key={chip.slug}
              ref={chip.slug === active ? actifRef : undefined}
              label={chip.name}
              active={chip.slug === active}
              onClick={() => onSelect(chip.slug)}
            />
          ))}
        </div>
      </div>
      {/* Fondu lateral : il reste du contenu a droite. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[color:var(--color-canvas)] to-transparent"
      />
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
  ref,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[length:var(--texte-carte)] font-medium transition-colors duration-[var(--duration-fast)] ${
        active
          ? 'bg-[color:var(--color-brand)] text-white'
          : 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]'
      }`}
    >
      {label}
    </button>
  );
}

function ActiveFilterSummary({
  filtres,
  onRemove,
  onClear,
}: {
  filtres: FiltresAvances;
  onRemove: (cle: keyof FiltresAvances) => void;
  onClear: () => void;
}) {
  const libelles: Record<string, string> = {
    gratuit: 'Gratuits',
    membre: 'Membres',
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    gemini: 'Gemini',
    image: 'Sortie image',
    texte: 'Sortie texte',
    pdf: 'Sortie PDF',
    faible: 'Utilisable direct',
    moyen: 'À vérifier',
    eleve: 'À faire relire',
  };

  const entrees = (Object.entries(filtres) as [keyof FiltresAvances, string | undefined][]).filter(
    (entree): entree is [keyof FiltresAvances, string] => Boolean(entree[1]),
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {entrees.map(([cle, valeur]) => (
        <button
          key={cle}
          type="button"
          onClick={() => onRemove(cle)}
          aria-label={`Retirer le filtre ${libelles[valeur] ?? valeur}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[color:var(--color-brand-soft)] pl-3 pr-2 text-[13px] font-medium text-[color:var(--color-brand-strong)]"
        >
          {libelles[valeur] ?? valeur}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m6 6 12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="h-8 px-1 text-[13px] font-medium text-[color:var(--color-muted)] underline underline-offset-2"
      >
        Effacer
      </button>
    </div>
  );
}
