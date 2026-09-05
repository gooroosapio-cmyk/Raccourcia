import { z } from 'zod';

import { CONTENT_STATUS, MEDIA_KINDS, MODES, PROVIDER_KEYS } from '@/lib/constants';

/**
 * Schemas du back-office. Aucune ecriture n'atteint la base sans passer par
 * l'un d'eux : le formulaire n'est jamais la seule barriere.
 */

/** Minuscules, sans espace ni accent, comme le reste du catalogue. */
const command = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^\/[a-z0-9][a-z0-9_-]*$/, 'La commande doit ressembler a /monraccourci.')
  .max(60);

const optionalText = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((value) => (value === '' ? undefined : value));

/** "a; b; c" ou une ligne par entree. */
const list = z
  .string()
  .max(2000)
  .optional()
  .transform((value) =>
    (value ?? '')
      .split(/[;\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 12),
  );

export const promptIdentityInput = z.object({
  command,
  name: z.string().trim().min(2).max(120),
  shortDescription: z.string().trim().min(5).max(300),
  mode: z.enum(MODES),
  categoryId: z.string().uuid().optional(),
  intention: optionalText,
  useCases: list,
  tags: list,
  expectedInput: optionalText,
  limitations: optionalText,
  adminNotes: optionalText,
  showImageCard: z.coerce.boolean().default(false),
  isFree: z.coerce.boolean().default(false),
  isFeatured: z.coerce.boolean().default(false),
  isNew: z.coerce.boolean().default(false),
});

export type PromptIdentityInput = z.infer<typeof promptIdentityInput>;

export const promptVersionInput = z.object({
  promptId: z.string().uuid(),
  variantId: z.string().uuid(),
  payload: z.string().trim().min(20, 'Le prompt complet parait trop court.').max(20000),
});

export const promptStatusInput = z.object({
  promptId: z.string().uuid(),
  status: z.enum(CONTENT_STATUS),
});

export const variantCompatibilityInput = z.object({
  promptId: z.string().uuid(),
  variantId: z.string().uuid(),
  published: z.coerce.boolean(),
});

export const categoryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Le slug ne prend que des minuscules et des tirets.')
    .max(80),
  mode: z.enum(MODES),
  parentId: z.string().uuid().optional(),
  shortDescription: optionalText,
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const categoryStatusInput = z.object({
  categoryId: z.string().uuid(),
  status: z.enum(CONTENT_STATUS),
});

export const mediaUploadInput = z.object({
  promptId: z.string().uuid(),
  kind: z.enum(MEDIA_KINDS),
  alt: z.string().trim().max(200).optional(),
});

export const mediaDeleteInput = z.object({
  promptId: z.string().uuid(),
  mediaId: z.string().uuid(),
});

export const accessInput = z.object({
  userId: z.string().uuid(),
  active: z.coerce.boolean(),
  reason: z.string().trim().max(200).optional(),
});

export const configInput = z.object({
  key: z.string().trim().min(2).max(80),
  value: z.string().trim().max(200),
});

export const newPromptInput = z.object({
  command,
  name: z.string().trim().min(2).max(120),
  mode: z.enum(MODES),
  shortDescription: z.string().trim().min(5).max(300),
  categoryId: z.string().uuid().optional(),
});

export const providerKeys = z.enum(PROVIDER_KEYS);
