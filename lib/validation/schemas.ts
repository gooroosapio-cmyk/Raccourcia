import { z } from 'zod';
import {
  MODES,
  OUTPUT_FORMAT_KINDS,
  PROVIDER_KEYS,
  RISK_LEVELS,
  SURFACES,
  CATALOG_PAGE_SIZE,
} from '@/lib/constants';

/**
 * Schemas d'entree serveur. Aucune confiance n'est accordee au client :
 * prompt_id, provider, role et droit sont toujours revalides (Doc Technique, 16.1).
 */

export const resolvePromptInput = z.object({
  promptId: z.string().uuid(),
  provider: z.enum(PROVIDER_KEYS),
  surface: z.enum(SURFACES).default('detail'),
});

export type ResolvePromptInput = z.infer<typeof resolvePromptInput>;

export const catalogQuery = z.object({
  mode: z.enum(MODES).default('image'),
  categorySlug: z.string().min(1).max(80).optional(),
  provider: z.enum(PROVIDER_KEYS).optional(),
  search: z.string().trim().max(80).optional(),
  sort: z.enum(['populaires', 'nouveaux', 'alpha']).default('populaires'),
  // Filtres avances. Chacun est une valeur d'une liste fermee : une valeur
  // inconnue arrivant par l'URL est ignoree, jamais transmise a la requete.
  access: z.enum(['gratuit', 'membre']).optional(),
  output: z.enum(OUTPUT_FORMAT_KINDS).optional(),
  level: z.enum(RISK_LEVELS).optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  // La bibliotheque s'affiche par lots cumules : la page en demande
  // `CATALOG_PAGE_SIZE * lot` d'un coup. La borne couvre le plus grand mode
  // du catalogue. Cette valeur n'est jamais lue depuis l'URL : la page
  // construit l'objet elle-meme, un visiteur ne peut donc pas s'en servir
  // pour reclamer tout le catalogue en une requete.
  pageSize: z.coerce.number().int().min(1).max(240).default(CATALOG_PAGE_SIZE),
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
 *
 * La confirmation est verifiee ici, cote serveur, et pas seulement dans le
 * formulaire : un mot de passe saisi de travers enfermerait dehors quelqu'un
 * qui vient de payer, et la seule sortie serait la recuperation — celle-la
 * meme qui redemande ce mot de passe.
 */
export const claimAccessInput = z
  .object({
    email: z.string().email().max(255),
    license: z.string().trim().min(6).max(120),
    password: z.string().min(8).max(200),
    passwordConfirm: z.string().min(8).max(200),
  })
  .refine((valeurs) => valeurs.password === valeurs.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Les deux mots de passe doivent être identiques.',
  });

export const revokeSessionInput = z.object({
  sessionId: z.string().uuid(),
});
