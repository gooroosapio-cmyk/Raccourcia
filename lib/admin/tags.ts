import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { TAG_GROUPS, type TagGroup } from '@/lib/constants';

/**
 * Les tags, vus de l'administration.
 *
 * Tous, y compris ceux que personne ne porte et ceux qui sont desactives :
 * ce sont precisement ceux-la qu'on vient regler. La lecture publique, elle,
 * n'en montre que les vivants — et c'est pour cela que ce sont deux lectures
 * distinctes et non un filtre en plus sur la meme.
 */
export type TagAdmin = {
  id: string;
  slug: string;
  nom: string;
  groupe: TagGroup;
  description: string | null;
  /** Chemin de stockage, ou `null`. La carte se rabat alors sur la marque. */
  image: string | null;
  actif: boolean;
  ordre: number;
  /** Toutes les commandes qui le portent, quel que soit leur statut. */
  total: number;
  /** Celles qui sont publiees : c'est ce que les membres voient. */
  publiees: number;
};

export async function listAdminTags(): Promise<TagAdmin[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_liste_tags');
  if (error) throw error;

  if (!Array.isArray(data)) return [];

  return (data as unknown[])
    .filter(
      (entree): entree is Record<string, unknown> =>
        typeof entree === 'object' && entree !== null && !Array.isArray(entree),
    )
    .map((entree) => ({
      id: String(entree.id ?? ''),
      slug: String(entree.slug ?? ''),
      nom: String(entree.nom ?? ''),
      groupe: String(entree.groupe ?? 'autre') as TagGroup,
      description: typeof entree.description === 'string' ? entree.description : null,
      image: typeof entree.image === 'string' ? entree.image : null,
      actif: entree.actif === true,
      ordre: typeof entree.ordre === 'number' ? entree.ordre : 0,
      total: typeof entree.total === 'number' ? entree.total : 0,
      publiees: typeof entree.publiees === 'number' ? entree.publiees : 0,
    }))
    .filter((tag) => tag.id !== '' && TAG_GROUPS.includes(tag.groupe));
}
