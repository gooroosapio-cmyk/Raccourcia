import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getAccessState } from '@/lib/access/entitlement';
import { publicEnv } from '@/lib/env';
import {
  CATALOG_PAGE_SIZE,
  CONFIG_FALLBACKS,
  CONFIG_KEYS,
  LEGAL_KEYS,
  MODES,
  STORAGE_BUCKETS,
  type LegalKey,
  type Mode,
} from '@/lib/constants';
import type { InputExampleKind, OutputFormatKind } from '@/lib/constants';
import type { BeforeAfter, CategoryNode, PromptCard, PromptDetail } from '@/lib/catalog/types';
import type { Enums } from '@/lib/supabase/database.types';
import type { CatalogQuery } from '@/lib/validation/schemas';
import { CatalogUnavailableError } from '@/lib/catalog/errors';

/** URL publique d'un media stocke dans Supabase Storage. */
function mediaUrl(storagePath: string): string {
  return `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKETS.PROMPT_MEDIA}/${storagePath}`;
}

/**
 * Configuration runtime publique. Activer le mode Analyse ou fermer les pages
 * publiques se fait ici, sans redeploiement.
 */
export const getPublicConfig = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from('app_config').select('key, value').eq('is_public', true);

  const read = <T>(key: string, fallback: T): T => {
    const row = data?.find((entry) => entry.key === key);
    return (row?.value as T) ?? fallback;
  };

  const regular = read<number>(
    CONFIG_KEYS.PRICE_REGULAR,
    CONFIG_FALLBACKS[CONFIG_KEYS.PRICE_REGULAR],
  );
  const current = read<number>(
    CONFIG_KEYS.PRICE_CURRENT,
    CONFIG_FALLBACKS[CONFIG_KEYS.PRICE_CURRENT],
  );

  return {
    publicCatalogEnabled: read<boolean>(
      CONFIG_KEYS.PUBLIC_CATALOG_ENABLED,
      CONFIG_FALLBACKS[CONFIG_KEYS.PUBLIC_CATALOG_ENABLED],
    ),
    purchaseUrl: read<string>(CONFIG_KEYS.PURCHASE_URL, CONFIG_FALLBACKS[CONFIG_KEYS.PURCHASE_URL]),
    price: {
      current,
      // Un prix de reference n'est barre que s'il est reellement superieur.
      // Barrer un montant egal ou inferieur serait une fausse remise.
      regular: regular > current ? regular : null,
      currency: read<string>(
        CONFIG_KEYS.PRICE_CURRENCY,
        CONFIG_FALLBACKS[CONFIG_KEYS.PRICE_CURRENCY],
      ),
    },
  };
});

/**
 * Informations legales de l'editeur.
 *
 * Une valeur absente reste absente : la page publique affiche alors une
 * mention "a completer" explicite. Inventer une raison sociale ou une adresse
 * serait plus grave qu'une page visiblement inachevee.
 */
export const getLegalInfo = cache(async (): Promise<Record<LegalKey, string>> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', LEGAL_KEYS as unknown as string[]);

  const entries = LEGAL_KEYS.map((key) => {
    const row = data?.find((entry) => entry.key === key);
    const value = typeof row?.value === 'string' ? row.value.trim() : '';
    return [key, value] as const;
  });

  return Object.fromEntries(entries) as Record<LegalKey, string>;
});

/**
 * Volumes du catalogue, pour la fenetre d'offre.
 *
 * Les chiffres sont lus et non ecrits en dur : ils doivent suivre le
 * catalogue, sans quoi l'argumentaire mentirait des la premiere publication.
 */
export const getCatalogCounts = cache(async () => {
  const supabase = await createClient();

  const [total, offerts] = await Promise.all([
    supabase.from('prompts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase
      .from('prompts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('is_free', true),
  ]);

  return { total: total.count ?? 0, free: offerts.count ?? 0 };
});

/**
 * Domaines proposes dans la bibliotheque.
 *
 * Le catalogue v2.0 n'en expose que deux : l'analyse est devenue une
 * sous-categorie de Texte, elle n'a plus de segment propre (Regles R01, R03).
 */
export function getAvailableModes(): readonly Mode[] {
  return MODES;
}

/**
 * Categories visibles d'un mode, avec leurs sous-categories.
 * La RLS filtre deja les categories masquees : une categorie desactivee
 * n'arrive tout simplement pas ici.
 */
export const getCategories = cache(async (mode: Enums<'app_mode'>): Promise<CategoryNode[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name, mode, parent_id, sort_order')
    .eq('mode', mode)
    .order('sort_order', { ascending: true });

  if (error) throw new CatalogUnavailableError(error);

  const rows = data ?? [];
  return rows
    .filter((row) => row.parent_id === null)
    .map((parent) => ({
      id: parent.id,
      slug: parent.slug,
      name: parent.name,
      mode: parent.mode,
      children: rows
        .filter((child) => child.parent_id === parent.id)
        .map((child) => ({ id: child.id, slug: child.slug, name: child.name })),
    }));
});

/** Colonnes publiques d'un raccourci. `payload` n'y figure jamais. */
const CARD_COLUMNS = `
  id, command, name, slug, mode, short_description, result_summary, use_cases, tags,
  show_image_card, is_free, is_new, is_featured, risk_level, sort_order,
  intention, expected_input, limitations, required_variables,
  input_examples, output_formats,
  prompt_variants!inner(compatibility, status, ai_providers!inner(key, name, is_active)),
  prompt_media(kind, storage_path, alt, sort_order)
`;

type CardRow = {
  id: string;
  command: string;
  name: string;
  slug: string;
  mode: Enums<'app_mode'>;
  short_description: string;
  result_summary: string | null;
  input_examples: InputExampleKind[] | null;
  output_formats: OutputFormatKind[] | null;
  use_cases: string[];
  tags: string[];
  show_image_card: boolean;
  is_free: boolean;
  is_new: boolean;
  is_featured: boolean;
  risk_level: Enums<'risk_level'>;
  intention: string | null;
  expected_input: string | null;
  limitations: string | null;
  required_variables: string[];
  prompt_variants: {
    compatibility: Enums<'compatibility_level'>;
    status: Enums<'content_status'>;
    ai_providers: { key: string; name: string; is_active: boolean } | null;
  }[];
  prompt_media: {
    kind: Enums<'media_kind'>;
    storage_path: string;
    alt: string | null;
    sort_order: number;
  }[];
};

/**
 * Comparaison Avant/Apres, ou rien.
 *
 * Les deux visuels sont exiges ensemble. Retomber sur l'image d'entree faute
 * de resultat afficherait une transformation qui n'a pas eu lieu ; c'est le
 * seul cas ou ne rien montrer vaut mieux que montrer quelque chose.
 */
function toBeforeAfter(media: CardRow['prompt_media']): BeforeAfter | null {
  const pick = (kind: Enums<'media_kind'>) =>
    (media ?? [])
      .filter((entry) => entry.kind === kind)
      .sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;

  const before = pick('before');
  const after = pick('after');
  if (!before || !after) return null;

  return {
    beforeUrl: mediaUrl(before.storage_path),
    beforeAlt: before.alt ?? 'Visuel de depart',
    afterUrl: mediaUrl(after.storage_path),
    afterAlt: after.alt ?? 'Resultat obtenu avec la commande',
  };
}

function toCard(row: CardRow, favorites: Set<string>): PromptCard {
  const thumbnail =
    row.prompt_media
      ?.filter((media) => media.kind === 'thumbnail' || media.kind === 'after')
      .sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;

  return {
    id: row.id,
    command: row.command,
    name: row.name,
    slug: row.slug,
    mode: row.mode,
    shortDescription: row.short_description,
    // La promesse de resultat prime ; a defaut, la description courte, qui
    // dit deja ce que le raccourci fait.
    resultSummary: row.result_summary?.trim() || row.short_description,
    beforeAfter: toBeforeAfter(row.prompt_media),
    inputExamples: row.input_examples ?? [],
    outputFormats: row.output_formats ?? [],
    useCases: row.use_cases ?? [],
    tags: row.tags ?? [],
    showImageCard: row.show_image_card,
    isFree: row.is_free,
    isNew: row.is_new,
    isFeatured: row.is_featured,
    riskLevel: row.risk_level,
    thumbnailUrl: thumbnail ? mediaUrl(thumbnail.storage_path) : null,
    thumbnailAlt: thumbnail?.alt ?? null,
    providers: (row.prompt_variants ?? [])
      .filter((variant) => variant.status === 'published' && variant.ai_providers?.is_active)
      .map((variant) => ({
        key: variant.ai_providers!.key,
        name: variant.ai_providers!.name,
        compatibility: variant.compatibility,
      })),
    isFavorite: favorites.has(row.id),
    intention: row.intention,
    expectedInput: row.expected_input,
    limitations: row.limitations,
    requiredVariables: row.required_variables ?? [],
  };
}

/** Favoris du membre courant, sous forme d'ensemble pour un rendu direct. */
async function getFavoriteIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase.from('favorites').select('prompt_id');
  return new Set((data ?? []).map((row) => row.prompt_id));
}

export type CatalogPage = { items: PromptCard[]; hasMore: boolean };

/**
 * Bibliotheque paginee. On ne renvoie jamais tout le catalogue d'un coup
 * (Blueprint Backend V1, 11.3).
 */
export async function getCatalogPage(query: CatalogQuery): Promise<CatalogPage> {
  const supabase = await createClient();
  const favorites = await getFavoriteIds();
  // Memoise par requete : l'appel ci-dessous ne coute rien de plus a la page,
  // qui interroge deja l'etat d'acces en parallele.
  const { hasLifetimeAccess } = await getAccessState();

  const pageSize = query.pageSize ?? CATALOG_PAGE_SIZE;
  const from = (query.page - 1) * pageSize;

  let request = supabase
    .from('prompts')
    .select(CARD_COLUMNS)
    .eq('mode', query.mode)
    .eq('status', 'published');

  if (query.categorySlug) {
    const { data: category } = await supabase
      .from('categories')
      .select('id, parent_id')
      .eq('slug', query.categorySlug)
      .maybeSingle();

    if (!category) return { items: [], hasMore: false };

    // Choisir une categorie parente inclut ses sous-categories.
    const { data: children } = await supabase
      .from('categories')
      .select('id')
      .eq('parent_id', category.id);

    const ids = [category.id, ...(children ?? []).map((child) => child.id)];
    request = request.in('category_id', ids);
  }

  if (query.search) {
    request = request.ilike('search_text', `%${query.search.toLowerCase()}%`);
  }

  if (query.provider) {
    request = request.eq('prompt_variants.ai_providers.key', query.provider);
  }

  if (query.access) {
    request = request.eq('is_free', query.access === 'gratuit');
  }

  if (query.output) {
    // `contains` sur un tableau : une commande peut produire plusieurs
    // formats, on garde celles qui produisent au moins celui demande.
    request = request.contains('output_formats', [query.output]);
  }

  // Sans acces, les raccourcis gratuits passent devant, quel que soit le tri
  // choisi : ce sont les seuls que le visiteur peut reellement copier, il doit
  // donc les trouver sans les chercher. Le tri demande s'applique ensuite.
  if (!hasLifetimeAccess) {
    request = request.order('is_free', { ascending: false });
  }

  if (query.sort === 'nouveaux') {
    request = request.order('published_at', { ascending: false, nullsFirst: false });
  } else if (query.sort === 'alpha') {
    request = request.order('name', { ascending: true });
  } else {
    request = request.order('is_featured', { ascending: false }).order('sort_order');
  }

  // On demande un element de plus pour savoir s'il reste une page.
  const { data, error } = await request.range(from, from + pageSize);
  if (error) throw new CatalogUnavailableError(error);

  const rows = (data ?? []) as unknown as CardRow[];

  return {
    items: rows.slice(0, pageSize).map((row) => toCard(row, favorites)),
    hasMore: rows.length > pageSize,
  };
}

/** Fiche detaillee. Le prompt complet reste absent : il passe par resolve. */
export async function getPromptDetail(slug: string): Promise<PromptDetail | null> {
  const supabase = await createClient();
  const favorites = await getFavoriteIds();

  const { data, error } = await supabase
    .from('prompts')
    .select(`${CARD_COLUMNS}, expected_output, categories(name)`)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  // Une base injoignable n'est pas un raccourci inexistant : on remonte
  // l'incident plutot que d'afficher une page "introuvable" trompeuse.
  if (error) throw new CatalogUnavailableError(error);
  if (!data) return null;

  const row = data as unknown as CardRow & {
    expected_output: string | null;
    categories: { name: string } | null;
  };

  return {
    ...toCard(row, favorites),
    expectedOutput: row.expected_output,
    categoryName: row.categories?.name ?? null,
    media: (row.prompt_media ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((media) => ({ kind: media.kind, url: mediaUrl(media.storage_path), alt: media.alt })),
  };
}

/** Vue Favoris : exactement les memes cartes que Decouvrir. */
export async function getFavorites(): Promise<PromptCard[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from('favorites')
    .select('prompt_id')
    .order('created_at', { ascending: false });

  if (error) throw new CatalogUnavailableError(error);

  const ids = (rows ?? []).map((row) => row.prompt_id);
  if (ids.length === 0) return [];

  const { data } = await supabase.from('prompts').select(CARD_COLUMNS).in('id', ids);
  const favorites = new Set(ids);
  const cards = ((data ?? []) as unknown as CardRow[]).map((row) => toCard(row, favorites));
  // Conserver l'ordre "ajoute recemment d'abord".
  return ids.map((id) => cards.find((card) => card.id === id)).filter((card) => card !== undefined);
}

/** Vue Recents : les raccourcis copies priment sur les simples consultations. */
export async function getRecents(): Promise<PromptCard[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from('recent_items')
    .select('prompt_id, last_copied_at, last_viewed_at')
    .limit(30);

  if (error) throw new CatalogUnavailableError(error);

  const ordered = (rows ?? [])
    .map((row) => ({
      id: row.prompt_id,
      at: row.last_copied_at ?? row.last_viewed_at ?? '',
      copied: row.last_copied_at !== null,
    }))
    .sort((a, b) => {
      if (a.copied !== b.copied) return a.copied ? -1 : 1;
      return b.at.localeCompare(a.at);
    });

  if (ordered.length === 0) return [];

  const favorites = await getFavoriteIds();
  const { data } = await supabase
    .from('prompts')
    .select(CARD_COLUMNS)
    .in(
      'id',
      ordered.map((entry) => entry.id),
    );

  const cards = ((data ?? []) as unknown as CardRow[]).map((row) => toCard(row, favorites));
  return ordered
    .map((entry) => cards.find((card) => card.id === entry.id))
    .filter((card) => card !== undefined);
}
