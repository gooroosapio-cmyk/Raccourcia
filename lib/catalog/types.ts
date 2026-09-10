import type { ExecutionLevel, InputExampleKind, OutputFormatKind } from '@/lib/constants';
import type { Enums } from '@/lib/supabase/database.types';

/**
 * Comparaison Avant/Apres d'un raccourci image.
 *
 * Les deux visuels sont toujours transmis ensemble ou pas du tout : une
 * comparaison a moitie renseignee ne se comprend pas, et dupliquer l'image
 * d'entree en guise de resultat mentirait sur ce que le raccourci produit.
 */
export type BeforeAfter = {
  beforeUrl: string;
  beforeAlt: string;
  afterUrl: string;
  afterAlt: string;
};

/** Ce qu'une carte affiche. Jamais le prompt complet. */
export type PromptCard = {
  id: string;
  command: string;
  name: string;
  slug: string;
  mode: Enums<'app_mode'>;
  shortDescription: string;
  /** Ce que l'utilisateur obtient, en une phrase. */
  resultSummary: string;
  useCases: string[];
  tags: string[];
  showImageCard: boolean;
  isFree: boolean;
  isNew: boolean;
  isFeatured: boolean;
  riskLevel: Enums<'risk_level'>;
  /**
   * Ce que la commande fera avant de produire, de A a E. `null` pour une
   * commande que le catalogue n'a pas encore graduee : la fiche n'annonce
   * alors rien plutot que d'inventer un niveau.
   */
  level: ExecutionLevel | null;
  /** Plafond de questions successives. `null` vaut aucune question. */
  maxQuestions: number | null;
  /**
   * Ce que la commande sait faire en plus de son cas principal : les titres
   * des raccourcis qu'elle a absorbes. Vide pour la plupart des commandes.
   */
  modes: string[];
  /** Comparaison complete, ou `null` tant que les deux visuels manquent. */
  beforeAfter: BeforeAfter | null;
  thumbnailUrl: string | null;
  thumbnailAlt: string | null;
  inputExamples: InputExampleKind[];
  outputFormats: OutputFormatKind[];
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
  /** A quoi sert la famille, telle que le catalogue la decrit. */
  description: string;
  mode: Enums<'app_mode'>;
  children: { id: string; slug: string; name: string }[];
};
