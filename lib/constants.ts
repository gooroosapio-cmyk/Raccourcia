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

/**
 * Niveau d'execution d'un raccourci, de A a E.
 *
 * Ce n'est pas une etiquette de difficulte : c'est ce qui decide combien une
 * commande a le droit de demander avant de produire. Un niveau A part de la
 * piece jointe et rend son resultat; un niveau E mene une mission en
 * plusieurs etapes. La liste est fermee, comme l'enum en base.
 */
export const EXECUTION_LEVELS = ['A', 'B', 'C', 'D', 'E'] as const;
export type ExecutionLevel = (typeof EXECUTION_LEVELS)[number];

/**
 * Ce que le niveau change pour la personne qui copie. Formule cote usage, pas
 * cote moteur : l'interface ne parle jamais le vocabulaire du backend.
 */
export const EXECUTION_LEVEL_LABELS: Record<ExecutionLevel, string> = {
  A: 'Résultat immédiat',
  B: 'Une précision demandée',
  C: 'Quelques précisions demandées',
  D: 'Cadrage guidé',
  E: 'Accompagnement complet',
};

export const APP_ROLES = ['user', 'admin', 'super_admin'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ENTITLEMENT_STATUS = ['active', 'suspended', 'revoked'] as const;
export type EntitlementStatus = (typeof ENTITLEMENT_STATUS)[number];

export const PURCHASE_STATUS = ['pending', 'completed', 'refunded', 'cancelled'] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUS)[number];

export const PROVIDER_KEYS = ['chatgpt', 'claude', 'gemini'] as const;
export type ProviderKey = (typeof PROVIDER_KEYS)[number];

/**
 * Ou coller la commande qu'on vient de copier.
 *
 * Une adresse d'accueil, jamais une adresse portant la commande : le contenu
 * complet ne doit jamais transiter par une URL, ou il finirait dans
 * l'historique du navigateur et dans les journaux du destinataire.
 */
export const PROVIDER_URLS: Record<ProviderKey, string> = {
  chatgpt: 'https://chatgpt.com/',
  claude: 'https://claude.ai/new',
  gemini: 'https://gemini.google.com/app',
};

export const PROVIDER_LABELS: Record<ProviderKey, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
};

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

/**
 * Entrees qu'un raccourci accepte. Liste fermee : chaque valeur porte une
 * icone et un libelle, qu'une chaine libre rendrait impossibles a associer.
 */
export const INPUT_EXAMPLE_KINDS = [
  'photo_produit',
  'photo_lieu',
  'photo_personne',
  'capture_ecran',
  'document_pdf',
  'texte_brut',
  'tableau',
  'url',
  'brief',
] as const;
export type InputExampleKind = (typeof INPUT_EXAMPLE_KINDS)[number];

export const INPUT_EXAMPLE_LABELS: Record<InputExampleKind, string> = {
  photo_produit: 'Photo de produit',
  photo_lieu: 'Photo de lieu',
  photo_personne: 'Photo de personne',
  capture_ecran: 'Capture d’écran',
  document_pdf: 'Document PDF',
  texte_brut: 'Texte brut',
  tableau: 'Tableau',
  url: 'Lien web',
  brief: 'Brief',
};

/** Formats reellement produits par un raccourci. */
export const OUTPUT_FORMAT_KINDS = [
  'image',
  'texte',
  'pdf',
  'document',
  'presentation',
  'tableur',
  'code',
  'audio',
  'video',
] as const;
export type OutputFormatKind = (typeof OUTPUT_FORMAT_KINDS)[number];

export const OUTPUT_FORMAT_LABELS: Record<OutputFormatKind, string> = {
  image: 'Image',
  texte: 'Texte',
  pdf: 'PDF',
  document: 'Document',
  presentation: 'Presentation',
  tableur: 'Tableur',
  code: 'Code',
  audio: 'Audio',
  video: 'Video',
};

/** Precision courte affichee sous chaque format, quand elle aide. */
export const OUTPUT_FORMAT_HINTS: Partial<Record<OutputFormatKind, string>> = {
  image: 'visuel final',
  texte: 'contenu prêt a publier',
  pdf: 'rapport structure',
  tableur: 'tableau exploitable',
  code: 'extrait prêt à coller',
};

/** Cles de configuration runtime, modifiables depuis /admin sans redeploiement. */
export const CONFIG_KEYS = {
  MAX_ACTIVE_SESSIONS: 'max_active_sessions',
  PUBLIC_CATALOG_ENABLED: 'public_catalog_enabled',
  PURCHASE_URL: 'purchase_url',
  PRICE_REGULAR: 'price_regular',
  PRICE_CURRENT: 'price_current',
  PRICE_CURRENCY: 'price_currency',
} as const;

/** Valeur par defaut si la table app_config est injoignable. */
export const CONFIG_FALLBACKS = {
  [CONFIG_KEYS.MAX_ACTIVE_SESSIONS]: 3,
  [CONFIG_KEYS.PUBLIC_CATALOG_ENABLED]: true,
  // Boutique Chariow. En configuration et non en dur : changer d'offre ou de
  // boutique ne doit pas demander un redeploiement.
  [CONFIG_KEYS.PURCHASE_URL]: 'https://oqyokpqq.mychariow.store/prd_kn3gxkco',
  // Un prix de repli a zero n'affiche rien plutot qu'un montant faux : mieux
  // vaut une offre sans prix qu'une offre au mauvais prix.
  [CONFIG_KEYS.PRICE_REGULAR]: 0,
  [CONFIG_KEYS.PRICE_CURRENT]: 0,
  [CONFIG_KEYS.PRICE_CURRENCY]: 'FCFA',
} as const;

/**
 * Informations que seul l'editeur detient. Elles vivent en configuration :
 * les ecrire dans le depot obligerait a un deploiement pour chaque correction
 * et y ferait entrer des donnees nominatives.
 */
export const LEGAL_KEYS = [
  'legal_editor',
  'legal_editor_form',
  'legal_capital',
  'legal_registration',
  'legal_address',
  'legal_representative',
  'legal_publication_director',
  'legal_host',
  'legal_host_address',
  'legal_host_contact',
  'legal_contact_email',
  'legal_privacy_email',
  'legal_support_email',
  'legal_payment_provider',
  'legal_refund_policy',
  'legal_retention_account',
  'legal_retention_support',
  'legal_retention_logs',
  'legal_updated_at',
] as const;
export type LegalKey = (typeof LEGAL_KEYS)[number];

/** Nombre d'elements charges par page de bibliotheque (section 11.3). */
export const CATALOG_PAGE_SIZE = 20;

/**
 * Nombre maximal de lots affichables d'un seul tenant.
 *
 * Dix lots couvrent le plus grand mode du catalogue : au-dela, ce n'est plus
 * une bibliotheque qu'on parcourt mais une liste qu'on subit, et la recherche
 * ou les categories font mieux le travail.
 */
export const CATALOG_MAX_LOTS = 10;

export const STORAGE_BUCKETS = {
  PUBLIC_ASSETS: 'public-assets',
  CATEGORY_MEDIA: 'category-media',
  PROMPT_MEDIA: 'prompt-media',
  ADMIN_TEMP: 'admin-temp',
} as const;
