/**
 * Vocabulaire central du produit. Aucun statut, mode ou role ne doit etre
 * ecrit en chaine libre ailleurs dans le code (Document Technique V1, 25.2).
 */

export const CONTENT_STATUS = ['draft', 'published', 'archived'] as const;
export type ContentStatus = (typeof CONTENT_STATUS)[number];

/** Modes racines du catalogue. `analyse` reste derriere un feature flag en V1. */
export const MODES = ['image', 'texte', 'analyse'] as const;
export type Mode = (typeof MODES)[number];

export const MODE_LABELS: Record<Mode, string> = {
  image: 'Image',
  texte: 'Texte',
  analyse: 'Analyse',
};

export const APP_ROLES = ['user', 'admin', 'super_admin'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ENTITLEMENT_STATUS = ['active', 'suspended', 'revoked'] as const;
export type EntitlementStatus = (typeof ENTITLEMENT_STATUS)[number];

export const PURCHASE_STATUS = ['pending', 'completed', 'refunded', 'cancelled'] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUS)[number];

export const PROVIDER_KEYS = ['chatgpt', 'claude', 'gemini'] as const;
export type ProviderKey = (typeof PROVIDER_KEYS)[number];

export const MEDIA_KINDS = ['thumbnail', 'before', 'after', 'example', 'cover'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const RISK_LEVELS = ['faible', 'moyen', 'eleve'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Cles de configuration runtime, modifiables depuis /admin sans redeploiement. */
export const CONFIG_KEYS = {
  MODE_ANALYSE_ENABLED: 'mode_analyse_enabled',
  MAX_ACTIVE_SESSIONS: 'max_active_sessions',
  PUBLIC_CATALOG_ENABLED: 'public_catalog_enabled',
} as const;

/** Valeur par defaut si la table app_config est injoignable. */
export const CONFIG_FALLBACKS = {
  [CONFIG_KEYS.MODE_ANALYSE_ENABLED]: false,
  [CONFIG_KEYS.MAX_ACTIVE_SESSIONS]: 3,
  [CONFIG_KEYS.PUBLIC_CATALOG_ENABLED]: true,
} as const;

/** Nombre d'elements charges par page de bibliotheque (section 11.3). */
export const CATALOG_PAGE_SIZE = 20;

export const STORAGE_BUCKETS = {
  PUBLIC_ASSETS: 'public-assets',
  CATEGORY_MEDIA: 'category-media',
  PROMPT_MEDIA: 'prompt-media',
  ADMIN_TEMP: 'admin-temp',
} as const;
