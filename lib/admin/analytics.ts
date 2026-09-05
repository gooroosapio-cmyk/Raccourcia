import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { MODE_LABELS, SURFACE_LABELS, type StoredMode, type Surface } from '@/lib/constants';
import type { Enums } from '@/lib/supabase/database.types';

/**
 * Lectures analytiques du back-office.
 *
 * Toutes les agregations sont faites en base : l'interface ne rapatrie jamais
 * copy_events ligne a ligne. Rien ici ne permet de savoir quel membre a copie
 * quel raccourci, seulement des totaux (Doc Technique V1, 18).
 */

/** Fenetres proposees. La valeur est bornee cote base de toute facon. */
export const ANALYTICS_WINDOWS = [7, 30, 90] as const;
export type AnalyticsWindow = (typeof ANALYTICS_WINDOWS)[number];

export const DEFAULT_WINDOW: AnalyticsWindow = 30;

export function parseWindow(value: string | undefined): AnalyticsWindow {
  const days = Number(value);
  return (ANALYTICS_WINDOWS as readonly number[]).includes(days)
    ? (days as AnalyticsWindow)
    : DEFAULT_WINDOW;
}

export type AnalyticsBar = { key: string; label: string; copies: number };

export type Analytics = {
  days: AnalyticsWindow;
  copiesPeriod: number;
  copiesTotal: number;
  activeMembers: number;
  membersWithAccess: number;
  purchasesCompleted: number;
  purchasesUnclaimed: number;
  promptsPublished: number;
  promptsCopied: number;
  daily: { day: string; copies: number }[];
  byMode: AnalyticsBar[];
  byProvider: AnalyticsBar[];
  bySurface: AnalyticsBar[];
  topPrompts: {
    promptId: string;
    command: string;
    name: string;
    mode: Enums<'app_mode'>;
    copies: number;
    members: number;
  }[];
  unusedPrompts: {
    promptId: string;
    command: string;
    name: string;
    mode: Enums<'app_mode'>;
  }[];
};

/** Libelle d'une cle de repartition : le mot du produit, jamais celui de la table. */
function labelFor(dimension: string, key: string, label: string | null): string {
  if (dimension === 'mode') return MODE_LABELS[key as StoredMode] ?? key;
  if (dimension === 'surface') return SURFACE_LABELS[key as Surface] ?? key;
  return label ?? key;
}

export async function getAnalytics(days: AnalyticsWindow): Promise<Analytics> {
  const supabase = await createClient();

  const [overview, daily, breakdown, top, unused] = await Promise.all([
    supabase.rpc('admin_analytics_overview', { p_days: days }),
    supabase.rpc('admin_analytics_daily', { p_days: days }),
    supabase.rpc('admin_analytics_breakdown', { p_days: days }),
    supabase.rpc('admin_analytics_top_prompts', { p_days: days, p_limit: 10 }),
    supabase.rpc('admin_analytics_unused_prompts', { p_days: days, p_limit: 10 }),
  ]);

  const totals = overview.data?.[0];
  const rows = breakdown.data ?? [];
  const bars = (dimension: string): AnalyticsBar[] =>
    rows
      .filter((row) => row.dimension === dimension)
      .map((row) => ({
        key: row.key,
        label: labelFor(row.dimension, row.key, row.label),
        copies: Number(row.copies),
      }));

  return {
    days,
    copiesPeriod: Number(totals?.copies_period ?? 0),
    copiesTotal: Number(totals?.copies_total ?? 0),
    activeMembers: Number(totals?.active_members ?? 0),
    membersWithAccess: Number(totals?.members_with_access ?? 0),
    purchasesCompleted: Number(totals?.purchases_completed ?? 0),
    purchasesUnclaimed: Number(totals?.purchases_unclaimed ?? 0),
    promptsPublished: Number(totals?.prompts_published ?? 0),
    promptsCopied: Number(totals?.prompts_copied ?? 0),
    daily: (daily.data ?? []).map((row) => ({ day: row.day, copies: Number(row.copies) })),
    byMode: bars('mode'),
    byProvider: bars('ia'),
    bySurface: bars('surface'),
    topPrompts: (top.data ?? []).map((row) => ({
      promptId: row.prompt_id,
      command: row.command,
      name: row.name,
      mode: row.mode,
      copies: Number(row.copies),
      members: Number(row.members),
    })),
    unusedPrompts: (unused.data ?? []).map((row) => ({
      promptId: row.prompt_id,
      command: row.command,
      name: row.name,
      mode: row.mode,
    })),
  };
}
