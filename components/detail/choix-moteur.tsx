'use client';

import { useState } from 'react';
import { CompatibilityList } from '@/components/detail/compatibility-list';
import { CopyCommandButton } from '@/components/cards/copy-command-button';
import type { Enums } from '@/lib/supabase/database.types';

type Provider = { key: string; name: string; compatibility: Enums<'compatibility_level'> };

/**
 * Choisir son IA, juste avant de copier.
 *
 * Chaque commande porte trois textes distincts, un par IA : la meme mission,
 * mais formulee pour les outils et les pieces jointes de chacune. Le choix
 * changeait donc reellement ce qui part dans le presse-papiers, alors qu'il
 * vivait en bas de la fiche sous un titre « Compatible avec » — lu comme une
 * information, pas comme une decision, et a plusieurs ecrans du bouton.
 *
 * Les deux sont maintenant au meme endroit, dans cet ordre : l'IA, la reserve
 * qui la concerne, puis la copie. Le bouton nomme l'IA choisie, pour que le
 * geste dise ce qu'il fait.
 */
export function ChoixMoteur({
  promptId,
  providers,
  surface,
  locked,
  selected,
  onSelect,
  onLockedClick,
  proposerOuverture = false,
}: {
  promptId: string;
  /** Deja filtrees : une IA non supportee n'a pas a etre proposee. */
  providers: Provider[];
  surface: 'carte' | 'detail' | 'page-publique';
  locked: boolean;
  /**
   * Choix pilote par le parent, quand il doit survivre a la fermeture de la
   * fiche. Sans lui, le bloc garde son propre choix — c'est le cas d'une page
   * publique, ou il n'y a rien a retenir d'une visite a l'autre.
   */
  selected?: string;
  onSelect?: (key: string) => void;
  onLockedClick?: () => void;
  proposerOuverture?: boolean;
}) {
  const [interne, setInterne] = useState<string | undefined>(undefined);
  const choisi = selected ?? interne ?? providers[0]?.key;
  const actif = providers.find((entry) => entry.key === choisi) ?? providers[0];

  const changer = (key: string) => {
    setInterne(key);
    onSelect?.(key);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Rien a choisir tant que la commande est verrouillee : le bouton
          n'ouvre pas l'IA mais l'offre, et proposer un reglage sans effet
          ferait croire que la copie est a portee. */}
      {!locked && providers.length > 1 ? (
        <>
          <p className="text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
            Le texte copié est adapté à l’IA choisie.
          </p>
          <CompatibilityList
            providers={providers}
            colonnes
            selected={actif?.key}
            onSelect={changer}
          />
        </>
      ) : null}

      {/* La reserve ne concerne que l'IA selectionnee : l'afficher pour les
          autres ferait douter d'une commande qui, elle, fonctionne. */}
      {!locked && actif?.compatibility === 'partiel' ? (
        <p className="text-[length:var(--texte-meta)] leading-relaxed text-[color:var(--color-warning)]">
          La commande fonctionne, mais la génération de l’image dépend de l’interface de cette IA.
        </p>
      ) : null}

      <CopyCommandButton
        promptId={promptId}
        provider={actif?.key ?? 'chatgpt'}
        surface={surface}
        locked={locked}
        onLockedClick={onLockedClick}
        proposerOuverture={proposerOuverture}
      />
    </div>
  );
}
