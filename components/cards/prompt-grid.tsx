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
 * Une colonne sur mobile, deux sur tablette, trois au maximum sur ordinateur :
 * la version large prolonge la version mobile, elle n'en invente pas une
 * autre.
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              // Seul le premier visuel est prioritaire : au-dela, le
              // chargement anticipe retarde ce qui est reellement a l'ecran.
              priority={index === 0}
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
