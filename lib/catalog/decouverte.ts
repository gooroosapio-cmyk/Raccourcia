import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { CatalogUnavailableError } from '@/lib/catalog/errors';
import { LARGEURS_VISUEL, urlVisuel } from '@/lib/media/url';
import type { CarteDecouverte, CurseurDecouverte, PageDecouverte } from '@/lib/catalog/types';

/**
 * Le feed Decouvrir : ce que les commandes produisent, avant ce qu'elles
 * demandent.
 *
 * On ne choisit pas une commande sur son nom. « /goldenselfie » ne dit rien ;
 * le selfie dore, si. La Bibliotheque range, l'Accueil oriente — cette page
 * montre, et c'est tout ce qu'elle fait.
 *
 * ELLE NE MONTRE QUE CE QUI EXISTE. Une carte sans visuel « apres » n'y entre
 * pas : une vitrine ou l'on defile entre des cadres vides ne donne envie de
 * rien. Il n'y a pas de seconde base d'images — le visuel est celui de la
 * commande, celui que l'administration a depose. Le remplacer la se voit ici
 * au rechargement suivant.
 */

// Les types vivent dans `types.ts` : ce module importe `server-only`, et un
// composant client qui en tirerait ne serait-ce qu'un type reposerait sur
// l'effacement des imports de type pour ne pas s'en trouver contamine.
export type { CarteDecouverte, CurseurDecouverte, PageDecouverte };

const PAR_PALIER = 8;

type LigneDecouverte = {
  id: string;
  slug: string;
  command: string;
  name: string;
  short_description: string;
  result_summary: string | null;
  is_free: boolean;
  like_count: number;
  discover_rank: number;
  prompt_media: { kind: string; storage_path: string; alt: string | null; sort_order: number }[];
  prompt_tags: { tags: { slug: string; name: string } | null }[];
};

const COLONNES = `
  id, slug, command, name, short_description, result_summary, is_free,
  like_count, discover_rank,
  prompt_media!inner(kind, storage_path, alt, sort_order),
  prompt_tags(tags(slug, name))
`;

/**
 * Un palier du feed.
 *
 * La jointure sur les visuels est **interne** : elle fait office de filtre,
 * et une commande sans « apres » ne remonte pas du tout. La faire externe
 * puis ecarter les cartes vides en memoire ferait des paliers de taille
 * variable, parfois vides, sur une page qui se parcourt au pouce.
 *
 * Le curseur porte le rang **et** l'identifiant. Deux commandes peuvent
 * partager un rang ; sans le second critere, la frontiere entre deux paliers
 * sauterait une carte ou la repeterait.
 */
export async function getDecouverte(
  curseur: CurseurDecouverte | null = null,
  limite = PAR_PALIER,
): Promise<PageDecouverte> {
  const supabase = await createClient();

  let requete = supabase
    .from('prompts')
    .select(COLONNES)
    .eq('status', 'published')
    .eq('prompt_media.kind', 'after');

  if (curseur) {
    // « strictement apres » sur le couple (rang, id) : PostgREST n'a pas de
    // comparaison de tuples, on l'ecrit en deux branches.
    requete = requete.or(
      `discover_rank.gt.${curseur.rang},and(discover_rank.eq.${curseur.rang},id.gt.${curseur.id})`,
    );
  }

  const { data, error } = await requete
    .order('discover_rank', { ascending: true })
    .order('id', { ascending: true })
    .limit(limite + 1);

  if (error) throw new CatalogUnavailableError(error);

  const lignes = (data ?? []) as unknown as LigneDecouverte[];
  const retenues = lignes.slice(0, limite);
  const derniere = retenues[retenues.length - 1];

  const aimees = await lesQuellesJaime(retenues.map((ligne) => ligne.id));

  return {
    cartes: retenues.map((ligne) => versCarte(ligne, aimees)),
    suite:
      lignes.length > limite && derniere ? { rang: derniere.discover_rank, id: derniere.id } : null,
  };
}

function versCarte(ligne: LigneDecouverte, aimees: Set<string>): CarteDecouverte {
  const visuel =
    (ligne.prompt_media ?? [])
      .filter((media) => media.kind === 'after')
      .sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;

  return {
    id: ligne.id,
    slug: ligne.slug,
    command: ligne.command,
    name: ligne.name,
    description: ligne.short_description || (ligne.result_summary ?? ''),
    // La jointure interne garantit le visuel ; la valeur de repli n'existe
    // que pour satisfaire le typage.
    visuelUrl: visuel ? urlVisuel(visuel.storage_path, LARGEURS_VISUEL.comparaison) : '',
    visuelAlt: visuel?.alt ?? `Résultat obtenu avec ${ligne.name}`,
    tags: (ligne.prompt_tags ?? [])
      .map((entree) => entree.tags)
      .filter((tag): tag is { slug: string; name: string } => tag !== null)
      .slice(0, 3),
    likeCount: ligne.like_count ?? 0,
    aime: aimees.has(ligne.id),
    isFree: ligne.is_free,
  };
}

/**
 * Ce que le membre courant a deja aime, parmi les cartes de ce palier.
 *
 * Une seule lecture bornee aux identifiants affiches, et non un drapeau par
 * carte : huit lectures par palier pour une information qui tient en une.
 * Vide pour un visiteur — il n'a rien aime, et la table lui est fermee en
 * ecriture de toute facon.
 */
async function lesQuellesJaime(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from('prompt_likes')
    .select('prompt_id')
    .eq('user_id', user.id)
    .in('prompt_id', ids);

  return new Set((data ?? []).map((ligne) => ligne.prompt_id));
}

/**
 * Combien de commandes le feed peut montrer.
 *
 * Sert a l'ecran vide : « aucune commande n'a encore de visuel » se dit
 * autrement que « le catalogue est vide ».
 */
export const compterLesVisuels = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const { count } = await supabase
    .from('prompts')
    .select('id, prompt_media!inner(kind)', { count: 'exact', head: true })
    .eq('status', 'published')
    .eq('prompt_media.kind', 'after');

  return count ?? 0;
});
