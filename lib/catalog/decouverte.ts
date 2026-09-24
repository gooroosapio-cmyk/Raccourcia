import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { CatalogUnavailableError } from '@/lib/catalog/errors';
import { LARGEURS_VISUEL, urlVisuel } from '@/lib/media/url';
import { resumerPourCarte } from '@/lib/format/resume';
import type {
  CarteDecouverte,
  CarteVoisine,
  CurseurDecouverte,
  PageDecouverte,
} from '@/lib/catalog/types';

/**
 * Le feed Decouvrir : ce que les commandes produisent, et rien d'autre.
 *
 * On ne choisit pas une commande sur son nom. « /goldenselfie » ne dit
 * rien ; le selfie dore, si. La Bibliotheque range, l'accueil oriente —
 * cette page montre.
 *
 * DES VISUELS, ET SEULEMENT DES VISUELS. Le feed a longtemps glisse trois
 * cartes ecrites entre sept images, pour que les commandes qui redigent ou
 * analysent ne soient pas absentes de la page. La regle a coute plus
 * qu'elle ne rapportait : sur un ecran plein qui s'aimante carte par carte,
 * un bloc de texte arrete net un parcours qu'on fait pour regarder, et il
 * n'en dit pas plus que ne le ferait sa fiche. Les Textes et les Reflexions
 * gardent la Bibliotheque et l'accueil, ou l'on vient lire ; ici, on
 * regarde.
 *
 * La consequence tient en une ligne de requete : une commande entre dans le
 * feed si elle est publiee, rangee dans la bibliotheque Images, et si elle
 * porte un visuel « apres ». La jointure interne fait office de filtre, donc
 * un palier ne se remplit jamais de cadres vides.
 */

type LigneDecouverte = {
  id: string;
  slug: string;
  command: string;
  name: string;
  short_description: string;
  result_summary: string | null;
  is_free: boolean;
  discover_rank: number;
  category_id: string | null;
  categories: { slug: string; name: string } | null;
  prompt_media: { kind: string; storage_path: string; alt: string | null; sort_order: number }[];
  prompt_tags: { tags: { slug: string; name: string; groupe: string } | null }[];
};

const COLONNES = `
  id, slug, command, name, short_description, result_summary,
  is_free, discover_rank, category_id,
  categories(slug, name),
  prompt_tags(tags(slug, name, groupe))
`;

/** Les images : celles qui ont un « apres », et elles seules. */
const COLONNES_IMAGE = `${COLONNES}, prompt_media!inner(kind, storage_path, alt, sort_order)`;

/**
 * Combien de cartes par palier.
 *
 * Dix : a peu pres dix gestes de pouce, ce qui laisse le temps au palier
 * suivant d'arriver sans jamais faire attendre devant une fin de liste
 * prematuree.
 */
const CARTES_PAR_PALIER = 10;

/**
 * Un palier du feed.
 *
 * Une seule lecture depuis que le feed ne montre que des images. Il y en
 * avait deux — une par vivier — suivies d'un entrelacement, parce qu'on ne
 * peut pas trier ensemble une photo et un plan de tresorerie : il n'existe
 * pas de critere commun aux deux. La question ne se pose plus.
 *
 * Le curseur porte le rang **et** l'identifiant : deux commandes peuvent
 * partager un rang, et sans le second critere la frontiere entre deux
 * paliers sauterait une carte ou la repeterait.
 */
export async function getDecouverte(
  curseur: CurseurDecouverte | null = null,
  { offertesSeulement = false }: { offertesSeulement?: boolean } = {},
): Promise<PageDecouverte> {
  const { lignes, suite } = await lireLesVisuels(curseur, CARTES_PAR_PALIER, offertesSeulement);

  const [favoris, voisinage] = await Promise.all([
    lesFavorisParmi(lignes.map((l) => l.id)),
    lesVoisines(lignes),
  ]);

  return {
    cartes: lignes.map((ligne) => versCarte(ligne, favoris, voisinage)),
    suite,
  };
}

/**
 * Les visuels du catalogue, du rang ou l'on en est.
 *
 * Trois conditions, et elles sont toutes les trois des filtres : publiee,
 * rangee dans la bibliotheque Images, et porteuse d'un visuel « apres ».
 * La jointure interne sur `prompt_media` fait ce dernier filtre — une
 * commande sans « apres » ne remonte pas du tout, donc le palier garde sa
 * taille au lieu de se remplir de cadres vides.
 *
 * Le filtre sur `library` est redondant avec la jointure tant qu'aucune
 * commande ecrite ne porte de visuel « apres ». Il est ecrit quand meme :
 * c'est lui qui dit la regle de la page, et le jour ou l'administration
 * deposera une illustration sur un Mode IA, elle n'atterrira pas ici par
 * accident.
 *
 * UNE QUATRIEME CONDITION POUR QUI N'A PAS L'ACCES. Decouvrir montrait les
 * deux cent trente-quatre commandes illustrees a tout le monde, et
 * verrouillait la copie a l'arrivee. Le visiteur parcourait donc un feed
 * dont il ne pouvait presque rien faire : chaque carte promettait un
 * resultat et chaque bouton renvoyait a l'offre. Il ne voit plus que ce
 * qu'il peut reellement utiliser.
 *
 * C'est un filtre de presentation et non une mesure de securite : le
 * contenu complet ne sort de toute facon que par `resolve_prompt`, apres
 * ses six controles. Ce qui change ici est ce qu'on donne a voir.
 */
async function lireLesVisuels(
  depuis: CurseurDecouverte | null,
  limite: number,
  offertesSeulement: boolean,
): Promise<{ lignes: LigneDecouverte[]; suite: CurseurDecouverte | null }> {
  const supabase = await createClient();

  let requete = supabase
    .from('prompts')
    .select(COLONNES_IMAGE)
    .eq('status', 'published')
    .eq('library', 'images')
    .eq('prompt_media.kind', 'after');

  if (offertesSeulement) requete = requete.eq('is_free', true);

  if (depuis) {
    // « strictement apres » sur le couple (rang, id) : PostgREST n'a pas de
    // comparaison de tuples, on l'ecrit en deux branches.
    requete = requete.or(
      `discover_rank.gt.${depuis.rang},and(discover_rank.eq.${depuis.rang},id.gt.${depuis.id})`,
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

  return {
    lignes: retenues,
    suite:
      lignes.length > limite && derniere ? { rang: derniere.discover_rank, id: derniere.id } : null,
  };
}

function versCarte(
  ligne: LigneDecouverte,
  favoris: Set<string>,
  voisinage: Map<string, CarteVoisine[]>,
): CarteDecouverte {
  const visuel =
    (ligne.prompt_media ?? [])
      .filter((media) => media.kind === 'after')
      .sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;

  return {
    id: ligne.id,
    slug: ligne.slug,
    command: ligne.command,
    name: ligne.name,
    // Bornee au mot pres, comme partout ailleurs : la carte pleine page en
    // reserve deux lignes, et une description de cent mots les depasserait.
    description: resumerPourCarte(ligne.short_description || (ligne.result_summary ?? '')),
    visuelUrl: visuel ? urlVisuel(visuel.storage_path, LARGEURS_VISUEL.comparaison) : '',
    visuelAlt: visuel?.alt ?? `Résultat obtenu avec ${ligne.name}`,
    // Ni la bibliotheque ni l'IA : la premiere se lit deja dans le rayon,
    // la seconde dans le selecteur de la fiche, et toutes deux reviennent
    // sur chaque carte.
    tags: (ligne.prompt_tags ?? [])
      .map((entree) => entree.tags)
      .filter((tag): tag is { slug: string; name: string; groupe: string } => tag !== null)
      .filter((tag) => tag.groupe !== 'bibliotheque' && tag.groupe !== 'ia')
      .slice(0, 3)
      .map((tag) => ({ slug: tag.slug, name: tag.name })),
    isFavorite: favoris.has(ligne.id),
    isFree: ligne.is_free,
    collection: ligne.categories
      ? { slug: ligne.categories.slug, nom: ligne.categories.name }
      : null,
    // Sans elle-meme : un rail qui rouvre la carte qu'on regarde deja
    // donne l'impression que le geste n'a rien fait.
    voisines: (voisinage.get(ligne.category_id ?? '') ?? []).filter(
      (voisine) => voisine.id !== ligne.id,
    ),
  };
}

/**
 * Les voisines de chaque collection du palier, en une seule lecture.
 *
 * Le feed se parcourt de haut en bas, au hasard. C'est sa promesse, et
 * c'est aussi sa limite : tomber sur un portrait vintage qui plait sans
 * pouvoir en voir d'autres du meme genre oblige a fermer la page, a
 * chercher le rayon, puis a recommencer. Le geste lateral repond a cela.
 *
 * UNE REQUETE POUR TOUT LE PALIER, et non une par carte. Dix cartes
 * feraient dix allers-retours avant le premier affichage — sur un reseau
 * mobile, c'est une seconde de page noire.
 *
 * On lit large puis on coupe a quatre par collection : PostgREST ne sait
 * pas limiter par groupe, et un `limit` global rendrait toutes les
 * voisines d'une seule collection.
 */
const VOISINES_PAR_COLLECTION = 4;

async function lesVoisines(lignes: LigneDecouverte[]): Promise<Map<string, CarteVoisine[]>> {
  const collections = [
    ...new Set(lignes.map((ligne) => ligne.category_id).filter((id): id is string => Boolean(id))),
  ];
  if (collections.length === 0) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('prompts')
    .select(
      'id, slug, name, command, is_free, category_id, prompt_media!inner(kind, storage_path, alt)',
    )
    .eq('status', 'published')
    .eq('prompt_media.kind', 'after')
    .in('category_id', collections)
    .order('is_pinned', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('command', { ascending: true })
    .limit(collections.length * VOISINES_PAR_COLLECTION * 3);

  // Le rail est un supplement : s'il manque, le feed vertical fonctionne
  // exactement comme avant. On ne fait donc pas tomber la page pour lui.
  if (error || !data) return new Map();

  const par = new Map<string, CarteVoisine[]>();
  for (const ligne of data as unknown as VoisineRow[]) {
    const cle = ligne.category_id ?? '';
    const deja = par.get(cle) ?? [];
    if (deja.length >= VOISINES_PAR_COLLECTION) continue;

    const visuel = (ligne.prompt_media ?? [])[0];
    if (!visuel) continue;

    deja.push({
      id: ligne.id,
      slug: ligne.slug,
      name: ligne.name,
      command: ligne.command,
      visuelUrl: urlVisuel(visuel.storage_path, LARGEURS_VISUEL.vignette),
      visuelAlt: visuel.alt ?? `Résultat obtenu avec ${ligne.name}`,
      isFree: ligne.is_free,
    });
    par.set(cle, deja);
  }

  // Une collection qui ne rend qu'une carte n'a pas de voisine : le rail
  // promettrait un geste qui ne mene nulle part.
  for (const [cle, cartes] of par) if (cartes.length < 2) par.delete(cle);

  return par;
}

type VoisineRow = {
  id: string;
  slug: string;
  name: string;
  command: string;
  is_free: boolean;
  category_id: string | null;
  prompt_media: { kind: string; storage_path: string; alt: string | null }[];
};

/**
 * Ce que le membre courant a en favori, parmi les cartes de ce palier.
 *
 * Une seule lecture bornee aux identifiants affiches, et non un drapeau par
 * carte : dix lectures par palier pour une information qui tient en une.
 * Vide pour un visiteur — il n'a pas de favori, et la table lui est
 * fermee de toute facon.
 */
async function lesFavorisParmi(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from('favorites')
    .select('prompt_id')
    .eq('user_id', user.id)
    .in('prompt_id', ids);

  return new Set((data ?? []).map((ligne) => ligne.prompt_id));
}

/**
 * Combien de commandes le feed peut montrer.
 *
 * Sert a l'ecran vide, et a lui seul : « aucune commande n'a encore de
 * visuel » se dit autrement que « le catalogue est vide », et les deux
 * appellent des gestes opposes — le premier une mise en ligne de visuels,
 * le second une publication de commandes.
 *
 * On compte donc exactement ce que le feed sait montrer : des commandes
 * publiees, rangees en Images, avec un visuel « apres ». Les Textes ne
 * comptent plus, puisqu'ils n'entrent plus dans la page ; les inclure
 * ferait dire « les visuels ne sont pas accessibles » a un catalogue qui
 * n'en a simplement aucun.
 */
export const compterLesVisuels = cache(async (offertesSeulement = false): Promise<number> => {
  const supabase = await createClient();

  let requete = supabase
    .from('prompts')
    .select('id, prompt_media!inner(kind)', { count: 'exact', head: true })
    .eq('status', 'published')
    .eq('library', 'images')
    .eq('prompt_media.kind', 'after');

  // Le compte suit exactement ce que le feed montre : sinon l'ecran vide
  // dirait « les visuels ne sont pas accessibles » a un visiteur devant un
  // catalogue qui n'a simplement aucune commande offerte illustree.
  if (offertesSeulement) requete = requete.eq('is_free', true);

  const { count } = await requete;
  return count ?? 0;
});
