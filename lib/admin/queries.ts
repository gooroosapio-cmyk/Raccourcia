import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { LARGEURS_VISUEL, urlVisuel } from '@/lib/media/url';
import { normaliserRecherche } from '@/lib/catalog/recherche';
import type { EntityType } from '@/lib/constants';
import type { Enums } from '@/lib/supabase/database.types';

/**
 * Lectures du back-office.
 *
 * Un administrateur voit tout le catalogue, brouillons et archives compris :
 * ses policies RLS le prevoient explicitement. Les payloads, eux, ne se lisent
 * jamais en direct, meme pour lui : ils passent par admin_get_prompt_versions.
 */

export type AdminPromptRow = {
  id: string;
  command: string;
  name: string;
  mode: Enums<'app_mode'>;
  status: Enums<'content_status'>;
  isFree: boolean;
  /** Remonte en tete de sa categorie. Outil d'administration, jamais affiche. */
  isPinned: boolean;
  categoryName: string | null;
  /** Visuel « avant » envoye depuis l'administration. */
  hasBefore: boolean;
  /** Visuel « apres » : celui que la carte montre dans la grille. */
  hasAfter: boolean;
  /**
   * L'apercu du resultat, quand il existe. C'est ce qui permet de
   * reconnaitre un raccourci dans une liste de six cents sans l'ouvrir : le
   * nom dit ce qu'il promet, l'image dit ce qu'il rend.
   */
  afterUrl: string | null;
  updatedAt: string;
};

export type AdminDashboard = {
  total: number;
  published: number;
  drafts: number;
  archived: number;
  byMode: Record<Enums<'app_mode'>, number>;
  hiddenCategories: number;
  incomplete: AdminPromptRow[];
  unmatchedPurchases: number;
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
  }[];
};

function toRow(row: {
  id: string;
  command: string;
  name: string;
  mode: Enums<'app_mode'>;
  status: Enums<'content_status'>;
  is_free: boolean;
  is_pinned: boolean;
  updated_at: string;
  categories: { name: string } | null;
  prompt_media: { kind: Enums<'media_kind'>; storage_path: string; sort_order: number }[] | null;
}): AdminPromptRow {
  const visuels = row.prompt_media ?? [];
  const apres = visuels
    .filter((media) => media.kind === 'after')
    .sort((a, b) => a.sort_order - b.sort_order)[0];
  return {
    id: row.id,
    command: row.command,
    name: row.name,
    mode: row.mode,
    status: row.status,
    isFree: row.is_free,
    isPinned: row.is_pinned,
    categoryName: row.categories?.name ?? null,
    hasBefore: visuels.some((media) => media.kind === 'before'),
    hasAfter: Boolean(apres),
    afterUrl: apres ? urlVisuel(apres.storage_path, LARGEURS_VISUEL.apercu) : null,
    updatedAt: row.updated_at,
  };
}

const ROW_COLUMNS =
  'id, command, name, mode, status, is_free, is_pinned, updated_at, categories(name), prompt_media(kind, storage_path, sort_order)';

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const supabase = await createClient();

  /**
   * Un compte se demande a la base, il ne se calcule pas ici.
   *
   * Ces chiffres venaient d'un `select('id, mode, status')` sans limite,
   * compte en memoire. A mille deux cents raccourcis cela passait ; a dix
   * mille, le tableau de bord telecharge dix mille lignes pour afficher cinq
   * nombres, et PostgREST s'arrete de toute facon a sa limite par defaut —
   * les totaux deviennent alors faux sans prevenir. `head: true` ne ramene
   * aucune ligne : seul l'en-tete de comptage voyage.
   */
  const total = supabase.from('prompts').select('id', { count: 'exact', head: true });
  const parStatut = (statut: Enums<'content_status'>) =>
    supabase.from('prompts').select('id', { count: 'exact', head: true }).eq('status', statut);
  const parMode = (mode: Enums<'app_mode'>) =>
    supabase.from('prompts').select('id', { count: 'exact', head: true }).eq('mode', mode);

  const [
    { count: nbTotal },
    { count: nbPublies },
    { count: nbBrouillons },
    { count: nbArchives },
    { count: nbImage },
    { count: nbTexte },
    { count: nbAnalyse },
    { count: nbCategoriesFermees },
    { data: logs },
    { count: unmatchedPurchases },
  ] = await Promise.all([
    total,
    parStatut('published'),
    parStatut('draft'),
    parStatut('archived'),
    parMode('image'),
    parMode('texte'),
    parMode('analyse'),
    supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('is_visible', false),
    supabase
      .from('admin_audit_logs')
      .select('id, action, entity_type, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    // Vente encaissee mais dont le produit Chariow n'est rattache a aucun
    // produit du catalogue : signale un chariow_product_id manquant.
    supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .is('product_id', null),
  ]);

  const byMode = {
    image: nbImage ?? 0,
    texte: nbTexte ?? 0,
    analyse: nbAnalyse ?? 0,
  } as Record<Enums<'app_mode'>, number>;

  // Contenus incomplets : publies mais sans categorie visible, donc invisibles
  // pour les membres sans que rien ne le signale.
  const { data: incomplete } = await supabase
    .from('prompts')
    .select(ROW_COLUMNS)
    .eq('status', 'published')
    .is('category_id', null)
    .limit(10);

  return {
    total: nbTotal ?? 0,
    published: nbPublies ?? 0,
    drafts: nbBrouillons ?? 0,
    archived: nbArchives ?? 0,
    byMode,
    hiddenCategories: nbCategoriesFermees ?? 0,
    incomplete: ((incomplete ?? []) as unknown as Parameters<typeof toRow>[0][]).map(toRow),
    unmatchedPurchases: unmatchedPurchases ?? 0,
    recentActivity: (logs ?? []).map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entity_type,
      createdAt: log.created_at,
    })),
  };
}

export type AdminPromptFilters = {
  search?: string;
  mode?: Enums<'app_mode'>;
  status?: Enums<'content_status'>;
  categoryId?: string;
  /** « gratuit » : copiable sans compte. « premium » : reserve aux membres. */
  access?: 'gratuit' | 'premium';
  /**
   * « avec » : la carte a de quoi se montrer. « sans » : elle attend encore
   * son visuel, et ferme donc la liste cote membre. C'est la meme colonne qui
   * decide de l'ordre du catalogue : filtrer dessus repond exactement a la
   * question « que reste-t-il a produire ? ».
   */
  media?: 'avec' | 'sans';
  /** Par quoi la liste est triee. Voir `TRIS_ADMIN`. */
  tri?: TriAdmin;
  page: number;
};

/**
 * Les ordres de lecture de la liste d'administration.
 *
 * « Modifie » repond a « ou en etais-je ? » et reste l'ordre par defaut.
 * « Catalogue » donne l'ordre reel d'affichage cote membre, le seul qui
 * permette de verifier ce qu'un visiteur verra en premier. « Titre » sert a
 * retrouver une commande dont on a le nom mais pas le raccourci — a plusieurs
 * milliers d'entrees, parcourir par date ne mene nulle part.
 */
export const TRIS_ADMIN = {
  modifie: { colonne: 'updated_at', ascendant: false, libelle: 'Modifié en dernier' },
  catalogue: { colonne: 'sort_order', ascendant: true, libelle: 'Ordre du catalogue' },
  titre: { colonne: 'name', ascendant: true, libelle: 'Titre (A→Z)' },
  commande: { colonne: 'command', ascendant: true, libelle: 'Raccourci (A→Z)' },
} as const;

export type TriAdmin = keyof typeof TRIS_ADMIN;

const ADMIN_PAGE_SIZE = 25;

/**
 * Une page de la liste d'administration, et le total qui lui correspond.
 *
 * Le total est demande separement, avec exactement les memes restrictions.
 * La liste ne disait que « page suivante » : on ignorait combien de
 * raccourcis un filtre retenait, donc s'il en retenait trop pour qu'on
 * travaille dessus un par un. A quelques centaines d'entrees c'est genant ;
 * a plusieurs milliers, c'est la seule chose qu'on veut savoir avant de
 * commencer.
 *
 * La recherche porte sur `search_norm`, la forme normalisee : « beaute »
 * trouve « Beauté ». Elle interrogeait `search_text`, qui garde les accents —
 * taper le mot sans accent ne ramenait rien, et rien ne le disait. Les deux
 * colonnes portent un index trigramme, le changement ne coute donc rien.
 */
export async function listAdminPrompts(
  filters: AdminPromptFilters,
): Promise<{ items: AdminPromptRow[]; hasMore: boolean; total: number; parPage: number }> {
  const supabase = await createClient();
  const from = (filters.page - 1) * ADMIN_PAGE_SIZE;
  const terme = filters.search ? normaliserRecherche(filters.search) : '';

  // Une seule construction pour la lecture et pour le comptage : deux chemins
  // separes finissent toujours par diverger, et le nombre annonce cesse alors
  // de decrire la liste montree.
  const construire = (colonnes: string, compter = false) => {
    let requete = compter
      ? supabase.from('prompts').select(colonnes, { count: 'exact', head: true })
      : supabase.from('prompts').select(colonnes);

    if (filters.mode) requete = requete.eq('mode', filters.mode);
    if (filters.status) requete = requete.eq('status', filters.status);
    if (filters.categoryId) requete = requete.eq('category_id', filters.categoryId);
    if (filters.access) requete = requete.eq('is_free', filters.access === 'gratuit');
    if (filters.media) requete = requete.eq('media_ready', filters.media === 'avec');
    if (terme) requete = requete.ilike('search_norm', `%${terme}%`);

    return requete;
  };

  const tri = TRIS_ADMIN[filters.tri ?? 'modifie'];

  const [lecture, comptage] = await Promise.all([
    construire(ROW_COLUMNS)
      .order(tri.colonne, { ascending: tri.ascendant })
      // Derniere cle unique : sans elle, deux ex aequo s'echangent d'une page
      // a l'autre et la meme ligne peut apparaitre deux fois ou disparaitre.
      .order('id', { ascending: true })
      .range(from, from + ADMIN_PAGE_SIZE),
    construire('id', true),
  ]);

  const rows = (lecture.data ?? []) as unknown as Parameters<typeof toRow>[0][];
  return {
    items: rows.slice(0, ADMIN_PAGE_SIZE).map(toRow),
    hasMore: rows.length > ADMIN_PAGE_SIZE,
    total: comptage.count ?? rows.length,
    parPage: ADMIN_PAGE_SIZE,
  };
}

export type AdminPromptDetail = {
  id: string;
  externalRef: string | null;
  command: string;
  name: string;
  /** Le genre d'experience. `null` pour un import anterieur au catalogue V2. */
  entityType: EntityType | null;
  /** Le personnage ou l'univers vise, quand la commande en vise un. */
  univers: string | null;
  /** Ce qu'on tape quand on ne connait pas le titre. */
  searchKeywords: string[];
  slug: string;
  mode: Enums<'app_mode'>;
  status: Enums<'content_status'>;
  categoryId: string | null;
  shortDescription: string;
  intention: string | null;
  useCases: string[];
  tags: string[];
  showImageCard: boolean;
  isFree: boolean;
  isFeatured: boolean;
  isNew: boolean;
  expectedInput: string | null;
  limitations: string | null;
  adminNotes: string | null;
  resultSummary: string | null;
  inputExamples: Enums<'input_example_kind'>[];
  outputFormats: Enums<'output_format_kind'>[];
  variants: {
    variantId: string;
    providerKey: string;
    providerName: string;
    compatibility: Enums<'compatibility_level'>;
    variantStatus: Enums<'content_status'>;
    versionLabel: string | null;
    payload: string | null;
  }[];
  media: { id: string; kind: Enums<'media_kind'>; url: string; alt: string | null }[];
};

export async function getAdminPrompt(id: string): Promise<AdminPromptDetail | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('prompts')
    .select(
      `id, external_ref, command, name, slug, mode, status, category_id, short_description,
       entity_type, univers, search_keywords,
       intention, use_cases, tags, show_image_card, is_free, is_featured, is_new,
       expected_input, limitations, admin_notes,
       result_summary, input_examples, output_formats,
       prompt_media(id, kind, storage_path, alt, sort_order)`,
    )
    .eq('id', id)
    .maybeSingle();

  if (!data) return null;

  // Les payloads passent par la fonction dediee : la table reste fermee.
  const { data: versions } = await supabase.rpc('admin_get_prompt_versions', {
    p_prompt_id: id,
  });

  const row = data as unknown as {
    id: string;
    external_ref: string | null;
    command: string;
    name: string;
    slug: string;
    mode: Enums<'app_mode'>;
    status: Enums<'content_status'>;
    category_id: string | null;
    short_description: string;
    entity_type: 'commande_image' | 'mode_ia' | 'parcours' | null;
    univers: string | null;
    search_keywords: string[] | null;
    intention: string | null;
    use_cases: string[];
    tags: string[];
    show_image_card: boolean;
    is_free: boolean;
    is_featured: boolean;
    is_new: boolean;
    expected_input: string | null;
    limitations: string | null;
    admin_notes: string | null;
    result_summary: string | null;
    input_examples: Enums<'input_example_kind'>[] | null;
    output_formats: Enums<'output_format_kind'>[] | null;
    prompt_media: {
      id: string;
      kind: Enums<'media_kind'>;
      storage_path: string;
      alt: string | null;
      sort_order: number;
    }[];
  };

  return {
    id: row.id,
    externalRef: row.external_ref,
    command: row.command,
    name: row.name,
    slug: row.slug,
    mode: row.mode,
    status: row.status,
    categoryId: row.category_id,
    shortDescription: row.short_description,
    entityType: row.entity_type,
    univers: row.univers,
    searchKeywords: row.search_keywords ?? [],
    intention: row.intention,
    useCases: row.use_cases ?? [],
    tags: row.tags ?? [],
    showImageCard: row.show_image_card,
    isFree: row.is_free,
    isFeatured: row.is_featured,
    isNew: row.is_new,
    expectedInput: row.expected_input,
    limitations: row.limitations,
    adminNotes: row.admin_notes,
    resultSummary: row.result_summary,
    inputExamples: row.input_examples ?? [],
    outputFormats: row.output_formats ?? [],
    variants: (versions ?? []).map((entry) => ({
      variantId: entry.variant_id,
      providerKey: entry.provider_key,
      providerName: entry.provider_name,
      compatibility: entry.compatibility,
      variantStatus: entry.variant_status,
      versionLabel: entry.version_label,
      payload: entry.payload,
    })),
    media: (row.prompt_media ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((media) => ({
        id: media.id,
        kind: media.kind,
        url: urlVisuel(media.storage_path, LARGEURS_VISUEL.comparaison),
        alt: media.alt,
      })),
  };
}

export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  mode: Enums<'app_mode'>;
  parentId: string | null;
  status: Enums<'content_status'>;
  isVisible: boolean;
  sortOrder: number;
  shortDescription: string | null;
  promptCount: number;
};

/** Toutes les categories, y compris masquees : l'admin doit les voir. */
export async function listAdminCategories(): Promise<AdminCategory[]> {
  const supabase = await createClient();

  const [{ data: categories }, { data: prompts }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, slug, name, mode, parent_id, status, is_visible, sort_order, short_description')
      .order('mode')
      .order('sort_order'),
    supabase.from('prompts').select('category_id'),
  ]);

  const counts = new Map<string, number>();
  for (const row of prompts ?? []) {
    if (row.category_id) counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return (categories ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    mode: row.mode,
    parentId: row.parent_id,
    status: row.status,
    isVisible: row.is_visible,
    sortOrder: row.sort_order,
    shortDescription: row.short_description,
    promptCount: counts.get(row.id) ?? 0,
  }));
}

/**
 * Les categories dans lesquelles on range un raccourci aujourd'hui.
 *
 * Chaque refonte de taxonomie laisse derriere elle des rayons desactives et
 * vides — la V6 en a laisse une douzaine pour le seul domaine image. Les
 * proposer dans une liste deroulante revient a offrir de classer une
 * commande la ou plus personne ne la cherchera.
 *
 * Une categorie desactivee qui porte encore des raccourcis reste proposee :
 * c'est par elle qu'on les retrouve pour les en sortir.
 */
export function categoriesDeRangement(categories: AdminCategory[]): AdminCategory[] {
  return categories.filter(
    (category) => category.status !== 'archived' || category.promptCount > 0,
  );
}

export type AdminConfigEntry = {
  key: string;
  value: string;
  kind: 'booleen' | 'nombre' | 'texte';
  description: string | null;
  isPublic: boolean;
};

/** Parametres modifiables sans redeploiement. */
export async function listAdminConfig(): Promise<AdminConfigEntry[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('app_config')
    .select('key, value, description, is_public')
    .order('key');

  return (data ?? []).map((row) => {
    // La valeur est du JSON : on la ramene a une chaine editable et on retient
    // son type pour choisir le bon champ de saisie.
    const kind =
      typeof row.value === 'boolean'
        ? 'booleen'
        : typeof row.value === 'number'
          ? 'nombre'
          : 'texte';

    return {
      key: row.key,
      value: typeof row.value === 'string' ? row.value : JSON.stringify(row.value),
      kind,
      description: row.description,
      isPublic: row.is_public,
    } as const;
  });
}

export type AdminMember = {
  id: string;
  email: string;
  hasAccess: boolean;
  accessStatus: Enums<'entitlement_status'> | null;
  activeSessions: number;
  createdAt: string;
};

/** Recherche de compte pour le support. */
export async function findMembers(search: string): Promise<AdminMember[]> {
  const supabase = await createClient();

  let request = supabase
    .from('profiles')
    .select('id, email, created_at, entitlements(status), app_sessions(status)')
    .limit(20);

  if (search) request = request.ilike('email', `%${search}%`);

  const { data } = await request.order('created_at', { ascending: false });

  return (
    (data ?? []) as unknown as {
      id: string;
      email: string;
      created_at: string;
      entitlements: { status: Enums<'entitlement_status'> }[];
      app_sessions: { status: Enums<'session_status'> }[];
    }[]
  ).map((row) => {
    const entitlement = row.entitlements?.[0] ?? null;
    return {
      id: row.id,
      email: row.email,
      hasAccess: entitlement?.status === 'active',
      accessStatus: entitlement?.status ?? null,
      activeSessions: (row.app_sessions ?? []).filter((s) => s.status === 'active').length,
      createdAt: row.created_at,
    };
  });
}
