import { z } from 'zod';

/**
 * Formes des evenements Chariow traites par le webhook.
 *
 * Volontairement permissifs : on ne valide que les champs dont depend le
 * traitement (email, identifiants), pas la structure complete envoyee par
 * Chariow. Un champ additionnel ne doit jamais faire echouer l'ingestion.
 */

const chariowCustomer = z.object({
  id: z.string().min(1),
  email: z.string().trim().email(),
});

export const chariowSaleEvent = z.object({
  event: z.literal('successful.sale'),
  sale: z.object({
    id: z.string().min(1),
    status: z.string().min(1),
    amount: z.object({
      value: z.number().int(),
      currency: z.string().min(1).max(10),
    }),
    created_at: z.string().min(1),
    completed_at: z.string().min(1).nullable().optional(),
  }),
  product: z.object({ id: z.string().min(1) }),
  customer: chariowCustomer,
});

export const chariowLicenseEvent = z.object({
  event: z.literal('license.issued'),
  license: z.object({
    id: z.string().min(1),
    key: z.string().min(4),
    created_at: z.string().min(1).optional(),
  }),
  product: z.object({ id: z.string().min(1) }),
  customer: chariowCustomer,
});

export type ChariowSaleEvent = z.infer<typeof chariowSaleEvent>;
export type ChariowLicenseEvent = z.infer<typeof chariowLicenseEvent>;
