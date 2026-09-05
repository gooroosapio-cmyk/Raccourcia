import { z } from 'zod';
import { MODES, PROVIDER_KEYS, CATALOG_PAGE_SIZE } from '@/lib/constants';

/**
 * Schemas d'entree serveur. Aucune confiance n'est accordee au client :
 * prompt_id, provider, role et droit sont toujours revalides (Doc Technique, 16.1).
 */

export const resolvePromptInput = z.object({
  promptId: z.string().uuid(),
  provider: z.enum(PROVIDER_KEYS),
  surface: z.enum(['carte', 'detail', 'page-publique']).default('detail'),
});

export type ResolvePromptInput = z.infer<typeof resolvePromptInput>;

export const catalogQuery = z.object({
  mode: z.enum(MODES).default('image'),
  categorySlug: z.string().min(1).max(80).optional(),
  provider: z.enum(PROVIDER_KEYS).optional(),
  search: z.string().trim().max(80).optional(),
  sort: z.enum(['populaires', 'nouveaux', 'alpha']).default('populaires'),
  page: z.coerce.number().int().min(1).max(100).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(CATALOG_PAGE_SIZE),
});

export type CatalogQuery = z.infer<typeof catalogQuery>;

export const toggleFavoriteInput = z.object({
  promptId: z.string().uuid(),
});

export const signInInput = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

/**
 * Activation ou recuperation : licence ET email de vente exiges ensemble,
 * puis definition du mot de passe (Doc Technique V1, 8.2).
 */
export const claimAccessInput = z.object({
  email: z.string().email().max(255),
  license: z.string().trim().min(6).max(120),
  password: z.string().min(8).max(200),
});

export const revokeSessionInput = z.object({
  sessionId: z.string().uuid(),
});
