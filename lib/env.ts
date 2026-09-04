import { z } from 'zod';

/**
 * Validation des variables d'environnement.
 *
 * Regle absolue (Document Technique V1, 12.2) : aucun secret dans NEXT_PUBLIC_*.
 * La validation est paresseuse afin qu'un build puisse aboutir sans les
 * secrets d'execution ; l'erreur survient au premier usage reel, pas a l'import.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  LICENSE_PEPPER: z.string().min(32),
  CHARIOW_WEBHOOK_SECRET: z.string().min(8).optional(),
  CHARIOW_API_KEY: z.string().min(8).optional(),
});

let cachedPublicEnv: z.infer<typeof publicSchema> | null = null;
let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

/** Variables lisibles cote navigateur. Ne jamais y placer de secret. */
export function publicEnv(): z.infer<typeof publicSchema> {
  if (!cachedPublicEnv) {
    // Les acces doivent rester litteraux pour que Next les remplace au build.
    cachedPublicEnv = publicSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    });
  }
  return cachedPublicEnv;
}

/** A n'appeler que depuis un contexte serveur (Server Component, Route Handler, Server Action). */
export function serverEnv(): z.infer<typeof serverSchema> {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() a ete appele depuis le navigateur.');
  }
  if (!cachedServerEnv) {
    cachedServerEnv = serverSchema.parse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      LICENSE_PEPPER: process.env.LICENSE_PEPPER,
      CHARIOW_WEBHOOK_SECRET: process.env.CHARIOW_WEBHOOK_SECRET,
      CHARIOW_API_KEY: process.env.CHARIOW_API_KEY,
    });
  }
  return cachedServerEnv;
}
