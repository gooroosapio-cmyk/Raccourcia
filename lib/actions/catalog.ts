'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { toggleFavoriteInput } from '@/lib/validation/schemas';

export type FavoriteResult = { isFavorite: boolean } | { error: string };

/** Ajoute ou retire un favori. L'interface applique un rendu optimiste. */
export async function toggleFavorite(promptId: string): Promise<FavoriteResult> {
  const parsed = toggleFavoriteInput.safeParse({ promptId });
  if (!parsed.success) return { error: 'Raccourci introuvable.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Reconnectez-vous pour continuer.' };

  const { data: existing } = await supabase
    .from('favorites')
    .select('prompt_id')
    .eq('prompt_id', parsed.data.promptId)
    .maybeSingle();

  if (existing) {
    await supabase.from('favorites').delete().eq('prompt_id', parsed.data.promptId);
    revalidatePath('/app/favoris');
    return { isFavorite: false };
  }

  const { error } = await supabase
    .from('favorites')
    .insert({ prompt_id: parsed.data.promptId, user_id: user.id });
  if (error) return { error: 'Impossible d’ajouter ce favori.' };

  revalidatePath('/app/favoris');
  return { isFavorite: true };
}

/** Journalise une consultation. Alimente la vue Recents, sans payload. */
export async function trackPromptView(promptId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc('track_prompt_view', { p_prompt_id: promptId });
}
