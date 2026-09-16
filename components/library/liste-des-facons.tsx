'use client';

import { useCallback, useMemo, useState } from 'react';
import { CarteMode } from '@/components/cards/carte-mode';
import { CarteParcours } from '@/components/cards/carte-parcours';
import { PromptDetailSheet } from '@/components/detail/prompt-detail';
import { openPaywall } from '@/components/paywall/paywall-provider';
import { Icone } from '@/components/ui/icone';
import { trackPromptView } from '@/lib/actions/catalog';
import { usePreferredProvider } from '@/lib/catalog/use-preferred-provider';
import { filtrerLesFacons, rayonsPresents } from '@/lib/catalog/facons';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * La liste des Modes IA, ou celle des Parcours guides.
 *
 * Ces deux ecrans montraient d'abord leurs sous-familles : sept tuiles bleues
 * pour les modes, deux pour les parcours. On arrivait donc sur un ecran qui
 * ne contenait rien de ce qu'on etait venu chercher, et il fallait un
 * deuxieme geste pour voir un seul mode. Les sous-familles sont devenues des
 * puces : on voit la liste tout de suite, et on la restreint si on veut.
 *
 * Les puces sont les familles reelles du catalogue, dans son ordre. Aucune
 * autre organisation n'est inventee ici : regrouper les quatre-vingt-deux
 * modes en trois themes plus jolis reviendrait a fabriquer une taxonomie que
 * la base ne connait pas, et que l'administration ne pourrait pas corriger.
 * Une famille qui ne ramene rien n'a pas de puce.
 *
 * Tout se filtre dans la page. Quatre-vingt-deux modes tiennent dans une
 * lecture ; un aller-retour par frappe couterait plus cher qu'il ne
 * rapporte, et la liste doit repondre pendant qu'on tape.
 */
export type Genre = 'mode_ia' | 'parcours';

export function ListeDesFacons({
  genre,
  cartes,
  rayons,
  icones,
  iconeRecherche,
  locked,
  visiteur = false,
  initialProvider = 'chatgpt',
  rayonInitial = null,
}: {
  genre: Genre;
  cartes: PromptCard[];
  /** Les familles de la liste, dans l'ordre du catalogue, deja abregees. */
  rayons: { slug: string; name: string }[];
  /** Le trait de chaque famille, resolu au serveur : par slug de famille. */
  icones: Record<string, string>;
  /**
   * La loupe, resolue au serveur elle aussi.
   *
   * Les soixante-douze traits du kit vivent dans un seul objet : y toucher
   * depuis le navigateur les y ferait tous entrer, soit une trentaine de
   * kilo-octets pour en dessiner huit. Les recopier ici les ferait diverger
   * du kit a la premiere mise a jour. Ils arrivent donc en proprietes.
   */
  iconeRecherche: string;
  locked: boolean;
  visiteur?: boolean;
  initialProvider?: string;
  /** La famille preselectionnee, quand on arrive par une ancienne adresse. */
  rayonInitial?: string | null;
}) {
  const [rayon, setRayon] = useState<string | null>(rayonInitial);
  const [terme, setTerme] = useState('');
  const [selection, setSelection] = useState<PromptCard | null>(null);
  const [provider, changeProvider] = usePreferredProvider(initialProvider);

  const ouvrir = useCallback(
    (prompt: PromptCard) => {
      if (visiteur && locked && !prompt.isFree) {
        openPaywall();
        return;
      }
      setSelection(prompt);
      if (!visiteur) void trackPromptView(prompt.id);
    },
    [locked, visiteur],
  );

  // Les puces suivent ce que la recherche a laisse : chercher « vente » puis
  // se voir proposer six familles vides ferait douter du filtre.
  const trouvees = useMemo(() => filtrerLesFacons(cartes, { terme }), [cartes, terme]);
  const puces = useMemo(() => rayonsPresents(trouvees, rayons), [trouvees, rayons]);
  const montrees = useMemo(() => filtrerLesFacons(trouvees, { rayon }), [trouvees, rayon]);

  // Une puce active qui ne ramene plus rien apres une frappe : la liste
  // serait vide sans qu'on comprenne laquelle des deux restrictions l'a
  // videe. La famille se relache, la recherche gagne.
  const actif = puces.some((puce) => puce.slug === rayon) ? rayon : null;
  const visibles = actif === rayon ? montrees : trouvees;

  const libelle = genre === 'mode_ia' ? 'Rechercher un mode…' : 'Rechercher un parcours…';

  return (
    <div className="space-y-3">
      <Recherche valeur={terme} onChange={setTerme} libelle={libelle} svg={iconeRecherche} />

      {puces.length > 1 ? (
        /* La rangee defile dans son cadre et non avec la page : sept familles
           ne tiennent pas sur 360 px, et les tronquer en cacherait la moitie
           sans le dire. */
        <div className="rail -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          <Puce active={actif === null} onClick={() => setRayon(null)}>
            Tous
          </Puce>
          {puces.map((puce) => (
            <Puce
              key={puce.slug}
              active={actif === puce.slug}
              onClick={() => setRayon(actif === puce.slug ? null : puce.slug)}
            >
              {puce.name}
            </Puce>
          ))}
        </div>
      ) : null}

      {visibles.length === 0 ? (
        <p className="py-8 text-center text-[length:var(--texte-carte)] text-[color:var(--color-muted)]">
          Aucun résultat. Essayez un autre mot.
        </p>
      ) : (
        /* Une colonne sur telephone : ces cartes se lisent, elles ne se
           survolent pas. Deux a partir de la tablette, ou une colonne unique
           laisserait la moitie de l'ecran vide. */
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-[var(--gouttiere-carte)]">
          {visibles.map((carte) => {
            const commun = {
              prompt: carte,
              icone: carte.collectionSlug ? (icones[carte.collectionSlug] ?? null) : null,
              locked: locked && !carte.isFree,
              visiteur,
              onOpen: ouvrir,
            };
            return genre === 'mode_ia' ? (
              <CarteMode key={carte.id} {...commun} />
            ) : (
              <CarteParcours key={carte.id} {...commun} />
            );
          })}
        </div>
      )}

      {selection ? (
        <PromptDetailSheet
          prompt={selection}
          provider={provider}
          onProviderChange={changeProvider}
          locked={locked && !selection.isFree}
          free={locked && selection.isFree}
          visiteur={visiteur}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </div>
  );
}

function Puce({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-[length:var(--texte-carte)] font-medium transition-colors duration-[var(--duration-fast)] ${
        active
          ? // L'etat retenu se voit a la couleur et au contour : la couleur
            // seule ne suffit pas a le dire.
            'border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-white'
          : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-night)]'
      }`}
    >
      {children}
    </button>
  );
}

function Recherche({
  valeur,
  onChange,
  libelle,
  svg,
}: {
  valeur: string;
  onChange: (valeur: string) => void;
  libelle: string;
  svg: string;
}) {
  return (
    <label className="flex h-12 items-center gap-2.5 rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5">
      <span className="text-[color:var(--color-muted)]">
        <Icone svg={svg} taille={20} />
      </span>
      <input
        type="search"
        value={valeur}
        onChange={(evenement) => onChange(evenement.target.value)}
        placeholder={libelle}
        aria-label={libelle}
        className="min-w-0 flex-1 bg-transparent text-[length:var(--texte-corps)] text-[color:var(--color-night)] outline-none placeholder:text-[color:var(--color-muted)]"
      />
    </label>
  );
}
