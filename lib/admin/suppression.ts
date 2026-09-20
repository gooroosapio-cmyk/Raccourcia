import 'server-only';

import { createClient } from '@/lib/supabase/server';

/**
 * Ce qu'une suppression emporterait, lu avant de la proposer.
 *
 * Une confirmation sans bilan n'est qu'un clic de plus. Le compte vient de
 * la base et non de ce que la page a deja charge : une fiche ouverte depuis
 * dix minutes ne sait rien des favoris poses entre-temps.
 */

export type BilanDeCommande = {
  visuels: number;
  variantes: number;
  versions: number;
  favoris: number;
  likes: number;
  tags: number;
  champs: number;
  /** Anciens liens dont cette commande est la destination. */
  liensAnciens: number;
};

export type BilanDeRayon = {
  nom: string;
  sousRayons: number;
  commandes: number;
};

export async function apercuDeSuppressionDeCommande(
  promptId: string,
): Promise<BilanDeCommande | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_apercu_suppression_commande', {
    p_prompt_id: promptId,
  });

  // Un bilan illisible n'est pas un bilan vide : la page dit alors qu'elle
  // ne sait pas, plutot que d'annoncer « rien ne sera emporte ».
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) return null;

  const brut = data as Record<string, unknown>;
  return {
    visuels: entier(brut.visuels),
    variantes: entier(brut.variantes),
    versions: entier(brut.versions),
    favoris: entier(brut.favoris),
    likes: entier(brut.likes),
    tags: entier(brut.tags),
    champs: entier(brut.champs),
    liensAnciens: entier(brut.liens_anciens),
  };
}

export async function apercuDeSuppressionDeRayon(categoryId: string): Promise<BilanDeRayon | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_apercu_suppression_categorie', {
    p_category_id: categoryId,
  });

  if (error || !data || typeof data !== 'object' || Array.isArray(data)) return null;

  const brut = data as Record<string, unknown>;
  return {
    nom: typeof brut.nom === 'string' ? brut.nom : '',
    sousRayons: entier(brut.sous_rayons),
    commandes: entier(brut.commandes),
  };
}

function entier(valeur: unknown): number {
  return typeof valeur === 'number' && Number.isFinite(valeur) ? Math.trunc(valeur) : 0;
}
