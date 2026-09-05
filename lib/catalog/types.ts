import type { Enums } from '@/lib/supabase/database.types';

/** Ce qu'une carte affiche. Jamais le prompt complet. */
export type PromptCard = {
  id: string;
  command: string;
  name: string;
  slug: string;
  mode: Enums<'app_mode'>;
  shortDescription: string;
  useCases: string[];
  tags: string[];
  showImageCard: boolean;
  isFree: boolean;
  isNew: boolean;
  isFeatured: boolean;
  riskLevel: Enums<'risk_level'>;
  thumbnailUrl: string | null;
  thumbnailAlt: string | null;
  providers: { key: string; name: string; compatibility: Enums<'compatibility_level'> }[];
  isFavorite: boolean;
  // Contenu de la fiche : entierement public, donc embarque avec la carte.
  // Ouvrir le detail ne declenche ainsi aucun aller-retour reseau.
  intention: string | null;
  expectedInput: string | null;
  limitations: string | null;
  requiredVariables: string[];
};

/** Ce que la page publique ajoute. Toujours sans le prompt complet. */
export type PromptDetail = PromptCard & {
  expectedOutput: string | null;
  categoryName: string | null;
  media: { kind: Enums<'media_kind'>; url: string; alt: string | null }[];
};

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  mode: Enums<'app_mode'>;
  children: { id: string; slug: string; name: string }[];
};
