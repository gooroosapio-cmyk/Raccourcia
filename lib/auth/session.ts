import 'server-only';

import { cache } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/database.types';

/**
 * Lecture de la session cote serveur. `cache` evite de refaire l'appel
 * plusieurs fois dans le meme rendu.
 */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (): Promise<Tables<'profiles'> | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return data;
});

/** Vrai si le compte courant possede un role d'administration. */
export const isAdmin = cache(async (): Promise<boolean> => {
  const user = await getUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data } = await supabase.rpc('is_admin');
  return data === true;
});

/**
 * Enregistre l'appareil courant et retourne le nombre de sessions actives.
 * L'interface s'en sert pour proposer une deconnexion au-dela de la limite,
 * plutot que de bloquer (Doc Technique V1, 8.3).
 */
export async function registerCurrentSession(deviceLabel?: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('register_app_session', {
    p_device_label: deviceLabel ?? undefined,
  });
  return data ?? 0;
}

/** Sessions applicatives du compte, la plus recente d'abord. */
export async function listSessions(): Promise<Tables<'app_sessions'>[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('app_sessions')
    .select('*')
    .eq('status', 'active')
    .order('last_seen_at', { ascending: false });
  return data ?? [];
}

/** Libelle d'appareil lisible, deduit du User-Agent. Aucune empreinte. */
export function deviceLabelFromUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Appareil inconnu';
  const ua = userAgent.toLowerCase();
  const os = ua.includes('iphone')
    ? 'iPhone'
    : ua.includes('ipad')
      ? 'iPad'
      : ua.includes('android')
        ? 'Android'
        : ua.includes('mac os')
          ? 'Mac'
          : ua.includes('windows')
            ? 'Windows'
            : ua.includes('linux')
              ? 'Linux'
              : 'Appareil';
  const browser = ua.includes('edg/')
    ? 'Edge'
    : ua.includes('chrome')
      ? 'Chrome'
      : ua.includes('firefox')
        ? 'Firefox'
        : ua.includes('safari')
          ? 'Safari'
          : 'Navigateur';
  return `${os} - ${browser}`;
}
