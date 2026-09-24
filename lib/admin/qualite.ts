import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { LARGEURS_VISUEL, urlVisuel } from '@/lib/media/url';
import { ALERTES_ADMIN, LIBRARIES, type AlerteAdmin, type Library } from '@/lib/constants';

/**
 * Ce que la Vue d'ensemble et la section Medias comptent.
 *
 * Des comptes demandes a la base (`head: true`), jamais des lignes comptees
 * ici : un tableau de bord qui telecharge le catalogue pour afficher cinq
 * nombres finit par se tromper sans prevenir.
 */

export type CompteDAlerte = { alerte: AlerteAdmin; libelle: string; total: number };

/** Le nombre de commandes concernees par chaque alerte de qualite. */
export async function compterLesAlertes(): Promise<CompteDAlerte[]> {
  const supabase = await createClient();
  const compte = (colonnes: string) =>
    supabase.from('prompts').select(colonnes, { count: 'exact', head: true });

  const [texteVide, visuelManquant, rayonMasque] = await Promise.all([
    compte('id').eq('payload_ready', false).neq('status', 'archived'),
    compte('id')
      .eq('library', 'images')
      .eq('show_image_card', true)
      .eq('media_ready', false)
      .neq('status', 'archived'),
    compte('id, rayon:categories!inner(is_visible)')
      .eq('status', 'published')
      .eq('rayon.is_visible', false),
  ]);

  return [
    { alerte: 'texte_vide' as const, total: texteVide.count ?? 0 },
    { alerte: 'visuel_manquant' as const, total: visuelManquant.count ?? 0 },
    { alerte: 'rayon_masque' as const, total: rayonMasque.count ?? 0 },
  ].map((ligne) => ({ ...ligne, libelle: ALERTES_ADMIN[ligne.alerte] }));
}

/** Les commandes publiees de chaque univers. */
export async function compterParUnivers(): Promise<Record<Library, number>> {
  const supabase = await createClient();
  const comptes = await Promise.all(
    LIBRARIES.map((univers) =>
      supabase
        .from('prompts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .eq('library', univers),
    ),
  );
  return Object.fromEntries(
    LIBRARIES.map((univers, rang) => [univers, comptes[rang]?.count ?? 0]),
  ) as Record<Library, number>;
}

export type InventaireDesMedias = {
  total: number;
  /** Deposes par la console : `created_by` renseigne. */
  administration: number;
  /** Sans auteur : anterieurs au controle d'origine, a verifier. */
  sansAuteur: number;
  parRole: { avant: number; apres: number; vignette: number };
  recents: {
    id: string;
    url: string;
    role: string;
    administration: boolean;
    creeLe: string;
    promptId: string;
    commande: string;
    nom: string;
  }[];
};

/**
 * L'inventaire des visuels, et leur provenance.
 *
 * Seul `created_by` distingue un visuel depose par la console d'un visuel
 * pose par script (CLAUDE.md) : la page le montre, elle n'efface rien.
 */
export async function inventorierLesMedias(): Promise<InventaireDesMedias> {
  const supabase = await createClient();
  const compte = () => supabase.from('prompt_media').select('id', { count: 'exact', head: true });

  const [total, administration, avant, apres, vignette, recents] = await Promise.all([
    compte(),
    compte().not('created_by', 'is', null),
    compte().eq('kind', 'before'),
    compte().eq('kind', 'after'),
    compte().eq('kind', 'thumbnail'),
    supabase
      .from('prompt_media')
      .select('id, kind, storage_path, created_by, created_at, prompts(id, command, name)')
      .order('created_at', { ascending: false })
      .limit(24),
  ]);

  const totalMedias = total.count ?? 0;
  const deAdministration = administration.count ?? 0;

  type Ligne = {
    id: string;
    kind: string;
    storage_path: string;
    created_by: string | null;
    created_at: string;
    prompts: { id: string; command: string; name: string } | null;
  };

  return {
    total: totalMedias,
    administration: deAdministration,
    sansAuteur: totalMedias - deAdministration,
    parRole: {
      avant: avant.count ?? 0,
      apres: apres.count ?? 0,
      vignette: vignette.count ?? 0,
    },
    recents: ((recents.data ?? []) as unknown as Ligne[])
      .filter((ligne) => ligne.prompts)
      .map((ligne) => ({
        id: ligne.id,
        url: urlVisuel(ligne.storage_path, LARGEURS_VISUEL.apercu),
        role: ligne.kind,
        administration: ligne.created_by !== null,
        creeLe: ligne.created_at,
        promptId: ligne.prompts!.id,
        commande: ligne.prompts!.command,
        nom: ligne.prompts!.name,
      })),
  };
}
