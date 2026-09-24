'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { oublierLaListe } from '@/components/admin/memoire-des-filtres';
import type { TagAdmin } from '@/lib/admin/tags';
import {
  ALERTES_ADMIN,
  CONTENT_STATUS,
  LIBRARIES,
  LIBRARY_LABELS,
  type AlerteAdmin,
} from '@/lib/constants';
import type { Enums } from '@/lib/supabase/database.types';

const STATUS_LABELS: Record<Enums<'content_status'>, string> = {
  published: 'Publies',
  draft: 'Brouillons',
  archived: 'Archives',
};

/** Le palier d'essai : ce qui se copie sans compte, et ce qui ne le fait pas. */
const ACCES = [
  { valeur: 'gratuit' as const, libelle: 'Gratuits' },
  { valeur: 'premium' as const, libelle: 'Premium' },
];

/**
 * Ce que la carte peut montrer.
 *
 * Meme colonne que celle qui decide de l'ordre du catalogue : « Sans visuel »
 * liste donc exactement ce qui ferme la liste cote membre, c'est-a-dire ce
 * qu'il reste a produire.
 */
const VISUELS = [
  { valeur: 'avec' as const, libelle: 'Avec visuel' },
  { valeur: 'sans' as const, libelle: 'Sans visuel' },
];

/**
 * Filtres de la liste admin. Ils passent par l'URL, comme cote membre.
 *
 * LE FILTRE PAR CATEGORIE A ETE RETIRE. Vingt-sept familles dans un menu
 * deroulant, au-dessus de quatre rangees de puces qui disent deja la
 * bibliotheque, l'etat, l'acces et le visuel : c'etait le seul filtre qui
 * demandait d'ouvrir une liste pour choisir, et le seul dont la valeur ne
 * se lisait pas d'un coup d'oeil une fois posee. Les puces de bibliotheque
 * repondent a la meme question d'un geste, et la recherche fait le reste.
 */
export function AdminPromptFilters({
  search,
  mode,
  status,
  access,
  media,
  library,
  tagId,
  alerte,
  tags,
}: {
  search?: string;
  mode?: Enums<'app_mode'>;
  status?: Enums<'content_status'>;
  access?: 'gratuit' | 'premium';
  media?: 'avec' | 'sans';
  library?: Enums<'app_library'>;
  tagId?: string;
  alerte?: AlerteAdmin;
  tags: TagAdmin[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [term, setTerm] = useState(search ?? '');

  const push = (next: URLSearchParams) => {
    next.delete('page');
    startTransition(() =>
      router.replace(`/admin/raccourcis?${next.toString()}`, { scroll: false }),
    );
  };

  useEffect(() => {
    if ((search ?? '') === term) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (term) next.set('q', term);
      else next.delete('q');
      push(next);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const toggle = (key: string, value: string, current?: string) => {
    const next = new URLSearchParams(params.toString());
    if (current === value) next.delete(key);
    else next.set(key, value);
    push(next);
  };

  const choisirTag = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set('tag', value);
    else next.delete('tag');
    push(next);
  };

  // Tout remettre a zero d'un geste. A huit filtres empilables, defaire un
  // par un pour revenir a la liste complete est un aller-retour par filtre,
  // et on finit par recharger la page a la main.
  const choisirAlerte = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set('alerte', value);
    else next.delete('alerte');
    push(next);
  };

  const actifs =
    (alerte ? 1 : 0) +
    (search ? 1 : 0) +
    (mode ? 1 : 0) +
    (status ? 1 : 0) +
    (access ? 1 : 0) +
    (media ? 1 : 0) +
    (library ? 1 : 0) +
    (tagId ? 1 : 0);

  const reinitialiser = () => {
    setTerm('');
    // La liste retenue part avec les filtres : sans cela, la restauration
    // les reposerait au rechargement suivant et le bouton n'aurait servi
    // qu'a les faire disparaitre une seconde.
    oublierLaListe();
    startTransition(() => router.replace('/admin/raccourcis', { scroll: false }));
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">Rechercher un raccourci</span>
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Rechercher une commande ou un titre..."
          className="h-11 w-full rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)] px-3 text-[15px] outline-none placeholder:text-[color:var(--color-muted)]"
        />
      </label>

      {/* Les alertes de qualite : chacune ouvre exactement les lignes a
          corriger. La Vue d'ensemble y mene directement. */}
      <label className="block">
        <span className="sr-only">Filtrer par alerte de qualité</span>
        <select
          value={alerte ?? ''}
          onChange={(event) => choisirAlerte(event.target.value)}
          className="h-11 w-full rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)] px-3 text-[15px] text-[color:var(--color-night)] outline-none"
        >
          <option value="">Toutes les commandes</option>
          {(Object.keys(ALERTES_ADMIN) as AlerteAdmin[]).map((cle) => (
            <option key={cle} value={cle}>
              Alerte : {ALERTES_ADMIN[cle]}
            </option>
          ))}
        </select>
      </label>

      {tags.length > 0 ? (
        <label className="block">
          <span className="sr-only">Filtrer par tag</span>
          <select
            value={tagId ?? ''}
            onChange={(event) => choisirTag(event.target.value)}
            className="h-11 w-full rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)] px-3 text-[15px] text-[color:var(--color-night)] outline-none"
          >
            <option value="">Tous les tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.nom} ({tag.total}){tag.actif ? '' : ' — désactivé'}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="pleine-largeur overflow-x-auto">
        <div className="flex w-max gap-2">
          {/* La bibliotheque en tete : c'est le premier axe du catalogue
              depuis la V2, et celui qui separe vraiment le travail — une
              carte image attend un visuel, une carte texte une relecture. */}
          {LIBRARIES.map((value) => (
            <Chip
              key={value}
              label={LIBRARY_LABELS[value]}
              active={library === value}
              onClick={() => toggle('bibliotheque', value, library)}
            />
          ))}
          <span aria-hidden="true" className="w-px bg-[color:var(--color-line)]" />
          {CONTENT_STATUS.map((value) => (
            <Chip
              key={value}
              label={STATUS_LABELS[value]}
              active={status === value}
              onClick={() => toggle('statut', value, status)}
            />
          ))}
          <span aria-hidden="true" className="w-px bg-[color:var(--color-line)]" />
          {ACCES.map(({ valeur, libelle }) => (
            <Chip
              key={valeur}
              label={libelle}
              active={access === valeur}
              onClick={() => toggle('acces', valeur, access)}
            />
          ))}
          <span aria-hidden="true" className="w-px bg-[color:var(--color-line)]" />
          {VISUELS.map(({ valeur, libelle }) => (
            <Chip
              key={valeur}
              label={libelle}
              active={media === valeur}
              onClick={() => toggle('visuel', valeur, media)}
            />
          ))}
        </div>
      </div>

      {actifs > 0 ? (
        <button
          type="button"
          onClick={reinitialiser}
          className="touch-target inline-flex items-center text-[13px] font-medium text-[color:var(--color-muted)] underline underline-offset-2"
        >
          Réinitialiser les {actifs} filtre{actifs > 1 ? 's' : ''}
        </button>
      ) : null}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 shrink-0 whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition-colors duration-[var(--duration-fast)] ${
        active
          ? 'bg-[color:var(--color-brand)] text-white'
          : 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]'
      }`}
    >
      {label}
    </button>
  );
}
