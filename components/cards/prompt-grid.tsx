'use client';

import { useCallback, useState } from 'react';
import { PromptCard } from '@/components/cards/prompt-card';
import { PromptSheet } from '@/components/bottom-sheet/prompt-sheet';
import { trackPromptView } from '@/lib/actions/catalog';
import { usePreferredProvider } from '@/lib/catalog/use-preferred-provider';
import type { PromptCard as PromptCardData } from '@/lib/catalog/types';

/**
 * Grille 2 colonnes et couche de detail.
 *
 * L'etat du sheet vit ici : fermer le detail ne retouche jamais la grille,
 * donc le scroll et les filtres restent exactement en place.
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
  const [selected, setSelected] = useState<PromptCardData | null>(null);
  const [provider, changeProvider] = usePreferredProvider(initialProvider);

  const open = useCallback((prompt: PromptCardData) => {
    setSelected(prompt);
    void trackPromptView(prompt.id);
  }, []);

  if (prompts.length === 0) return <>{emptyState}</>;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {prompts.map((prompt) => (
          <PromptCard
            key={prompt.id}
            prompt={prompt}
            provider={provider}
            locked={locked && !prompt.isFree}
            free={locked && prompt.isFree}
            onOpen={open}
          />
        ))}
      </div>

      {selected ? (
        <PromptSheet
          prompt={selected}
          provider={provider}
          onProviderChange={changeProvider}
          locked={locked && !selected.isFree}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}
