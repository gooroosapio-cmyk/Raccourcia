import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';
import { STORAGE_BUCKETS } from '@/lib/constants';
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
  prompt_media: { kind: Enums<'media_kind'> }[] | null;
}): AdminPromptRow {
  const visuels = row.prompt_media ?? [];
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
    hasAfter: visuels.some((media) => media.kind === 'after'),
    updatedAt: row.updated_at,
  };
}

const ROW_COLUMNS =
  'id, command, name, mode, status, is_free, is_pinned, updated_at, categories(name), prompt_media(kind)';

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const supabase = await createClient();

  const [{ data: prompts }, { data: categories }, { data: logs }, { count: unmatchedPurchases }] =
    await Promise.all([
      supabase.from('prompts').select('id, mode, status'),
      supabase.from('categories').select('id, is_visible'),
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

  const rows = prompts ?? [];
  const byMode = { image: 0, texte: 0, analyse: 0 } as Record<Enums<'app_mode'>, number>;
  for (const row of rows) byMode[row.mode] += 1;

  // Contenus incomplets : publies mais sans categorie visible, donc invisibles
  // pour les membres sans que rien ne le signale.
  const { data: incomplete } = await supabase
    .from('prompts')
    .select(ROW_COLUMNS)
    .eq('status', 'published')
    .is('category_id', null)
    .limit(10);

  return {
    total: rows.length,
    published: rows.filter((row) => row.status === 'published').length,
    drafts: rows.filter((row) => row.status === 'draft').length,
    archived: rows.filter((row) => row.status === 'archived').length,
    byMode,
    hiddenCategories: (categories ?? []).filter((row) => !row.is_visible).length,
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
  page: number;
};

const ADMIN_PAGE_SIZE = 25;

export async function listAdminPrompts(
  filters: AdminPromptFilters,
): Promise<{ items: AdminPromptRow[]; hasMore: boolean }> {
  const supabase = await createClient();
  const from = (filters.page - 1) * ADMIN_PAGE_SIZE;

  let request = supabase.from('prompts').select(ROW_COLUMNS);

  if (filters.mode) request = request.eq('mode', filters.mode);
  if (filters.status) request = request.eq('status', filters.status);
  if (filters.categoryId) request = request.eq('category_id', filters.categoryId);
  if (filters.access) request = request.eq('is_free', filters.access === 'gratuit');
  if (filters.media) request = request.eq('media_ready', filters.media === 'avec');
  if (filters.search) request = request.ilike('search_text', `%${filters.search.toLowerCase()}%`);

  const { data } = await request
    .order('updated_at', { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE);

  const rows = (data ?? []) as unknown as Parameters<typeof toRow>[0][];
  return {
    items: rows.slice(0, ADMIN_PAGE_SIZE).map(toRow),
    hasMore: rows.length > ADMIN_PAGE_SIZE,
  };
}

export type AdminPromptDetail = {
  id: string;
  externalRef: string | null;
  command: string;
  name: string;
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
        url: `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKETS.PROMPT_MEDIA}/${media.storage_path}`,
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
