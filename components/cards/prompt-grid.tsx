'use client';

import { useCallback, useState } from 'react';
import { ImagePromptCard } from '@/components/cards/image-prompt-card';
import { TextPromptCard } from '@/components/cards/text-prompt-card';
import { PromptDetailSheet } from '@/components/detail/prompt-detail';
import { trackPromptView } from '@/lib/actions/catalog';
import { usePreferredProvider } from '@/lib/catalog/use-preferred-provider';
import type { PromptCard as PromptCardData } from '@/lib/catalog/types';

/**
 * Liste des commandes et couche de detail.
 *
 * Deux colonnes sur mobile, trois sur tablette, quatre au maximum sur
 * ordinateur : la version large prolonge la version mobile, elle n'en invente
 * pas une autre.
 *
 * Deux colonnes des le telephone, parce qu'une seule ne montrait qu'une
 * commande par ecran sur un catalogue de trois cents. La gouttiere se resserre
 * sur les ecrans les plus etroits plutot que de sacrifier une colonne.
 *
 * L'etat de la fiche vit ici : l'ouvrir puis la fermer ne retouche jamais la
 * liste, donc le defilement et les filtres restent exactement en place.
 */
export function PromptGrid({
  prompts,
  locked,
  emptyState,
  initialProvider = 'chatgpt',
}: {
  prompts: PromptCardData[];
  locked: boolean;
  emptyState: React.ReactNode;
  initialProvider?: string;
}) {
  const [selection, setSelection] = useState<PromptCardData | null>(null);
  const [provider, changeProvider] = usePreferredProvider(initialProvider);

  const ouvrir = useCallback((prompt: PromptCardData) => {
    setSelection(prompt);
    void trackPromptView(prompt.id);
  }, []);

  if (prompts.length === 0) return <>{emptyState}</>;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 min-[400px]:gap-[var(--gouttiere-carte)] sm:grid-cols-3 lg:grid-cols-4">
        {prompts.map((prompt, index) => {
          const commun = {
            prompt,
            provider,
            locked: locked && !prompt.isFree,
            free: locked && prompt.isFree,
            onOpen: ouvrir,
          };

          return prompt.showImageCard ? (
            <ImagePromptCard
              key={prompt.id}
              {...commun}
              // Seules les deux premieres vignettes sont prioritaires : ce
              // sont les seules certaines d'etre a l'ecran au chargement.
              priority={index < 2}
            />
          ) : (
            <TextPromptCard key={prompt.id} {...commun} />
          );
        })}
      </div>

      {selection ? (
        <PromptDetailSheet
          prompt={selection}
          provider={provider}
          onProviderChange={changeProvider}
          locked={locked && !selection.isFree}
          free={locked && selection.isFree}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </>
  );
}
