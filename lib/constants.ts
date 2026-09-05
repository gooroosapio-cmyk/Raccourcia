/**
 * Vocabulaire central du produit. Aucun statut, mode ou role ne doit etre
 * ecrit en chaine libre ailleurs dans le code (Document Technique V1, 25.2).
 */

export const CONTENT_STATUS = ['draft', 'published', 'archived'] as const;
export type ContentStatus = (typeof CONTENT_STATUS)[number];

/**
 * Domaines exposes par la navigation. Le catalogue v2.0 n'en compte que deux
 * (Regle R01) : les raccourcis d'analyse sont ranges dans
 * Texte > Travail & pilotage > Analyser & decider (Regle R03).
 */
export const MODES = ['image', 'texte'] as const;
export type Mode = (typeof MODES)[number];

/**
 * Valeurs historiques de `app_mode`. `analyse` n'est plus un domaine public
 * mais reste dans l'enum : aucune donnee n'est perdue et un contenu ancien
 * garde un libelle lisible.
 */
export const STORED_MODES = ['image', 'texte', 'analyse'] as const;
export type StoredMode = (typeof STORED_MODES)[number];

export const MODE_LABELS: Record<StoredMode, string> = {
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

/** D'ou part une copie. Alimente `copy_events.surface`. */
export const SURFACES = ['carte', 'detail', 'page-publique'] as const;
export type Surface = (typeof SURFACES)[number];

export const SURFACE_LABELS: Record<Surface, string> = {
  carte: 'Depuis la carte',
  detail: 'Depuis la fiche',
  'page-publique': 'Page publique',
};

export const MEDIA_KINDS = ['thumbnail', 'before', 'after', 'example', 'cover'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const RISK_LEVELS = ['faible', 'moyen', 'eleve'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Cles de configuration runtime, modifiables depuis /admin sans redeploiement. */
export const CONFIG_KEYS = {
  MAX_ACTIVE_SESSIONS: 'max_active_sessions',
  PUBLIC_CATALOG_ENABLED: 'public_catalog_enabled',
} as const;

/** Valeur par defaut si la table app_config est injoignable. */
export const CONFIG_FALLBACKS = {
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
