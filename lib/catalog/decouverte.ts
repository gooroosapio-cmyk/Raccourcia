import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { CatalogUnavailableError } from '@/lib/catalog/errors';
import { LARGEURS_VISUEL, urlVisuel } from '@/lib/media/url';
import { LIBRARY_LABELS, type Library } from '@/lib/constants';
import type {
  CarteDecouverte,
  CarteVoisine,
  CurseurDecouverte,
  PageDecouverte,
} from '@/lib/catalog/types';

/**
 * Le feed Decouvrir : ce que les commandes produisent, avant ce qu'elles
 * demandent.
 *
 * On ne choisit pas une commande sur son nom. « /goldenselfie » ne dit
 * rien ; le selfie dore, si. La Bibliotheque range, l'accueil oriente —
 * cette page montre.
 *
 * SEPT IMAGES POUR TROIS TEXTES. Le catalogue n'est pas qu'une galerie :
 * un tiers de ses commandes redige, analyse ou converse, et celles-la
 * n'ont pas de resultat a montrer. Les exclure reviendrait a dire qu'elles
 * n'existent pas ; les melanger a parts egales ferait d'une page de
 * decouverte visuelle un sommaire. Sept pour trois garde la promesse de la
 * page et laisse sa place au reste.
 *
 * Une carte image montre son resultat. Une carte texte montre ce qu'elle
 * fait, ecrit : c'est son equivalent de l'image, et un cadre vide avec un
 * nom dedans ne donnerait envie de rien.
 */

/** Dix par palier : sept images, trois textes. */
const IMAGES_PAR_PALIER = 7;
const TEXTES_PAR_PALIER = 3;

type LigneDecouverte = {
  id: string;
  slug: string;
  command: string;
  name: string;
  short_description: string;
  result_summary: string | null;
  intention: string | null;
  library: Library | null;
  is_free: boolean;
  like_count: number;
  discover_rank: number;
  category_id: string | null;
  categories: { slug: string; name: string } | null;
  prompt_media: { kind: string; storage_path: string; alt: string | null; sort_order: number }[];
  prompt_tags: { tags: { slug: string; name: string; groupe: string } | null }[];
};

const COLONNES = `
  id, slug, command, name, short_description, result_summary, intention,
  library, is_free, like_count, discover_rank, category_id,
  categories(slug, name),
  prompt_tags(tags(slug, name, groupe))
`;

/** Les images : celles qui ont un « apres », et elles seules. */
const COLONNES_IMAGE = `${COLONNES}, prompt_media!inner(kind, storage_path, alt, sort_order)`;

/**
 * Un palier du feed.
 *
 * Deux lectures, une par vivier, puis un entrelacement. Une seule lecture
 * melangee obligerait a trier les deux catalogues ensemble, donc a choisir
 * un critere commun a une photo et a un plan de tresorerie — il n'y en a
 * pas.
 *
 * Chaque curseur porte le rang **et** l'identifiant : deux commandes
 * peuvent partager un rang, et sans le second critere la frontiere entre
 * deux paliers sauterait une carte ou la repeterait.
 */
export async function getDecouverte(
  curseur: CurseurDecouverte | null = null,
): Promise<PageDecouverte> {
  const [images, textes] = await Promise.all([
    lireUnVivier('images', curseur?.image ?? null, IMAGES_PAR_PALIER),
    lireUnVivier('textes', curseur?.texte ?? null, TEXTES_PAR_PALIER),
  ]);

  const lignes = [...images.lignes, ...textes.lignes];
  const [aimees, voisinage] = await Promise.all([
    lesQuellesJaime(lignes.map((l) => l.id)),
    lesVoisines(lignes),
  ]);

  const cartesImage = images.lignes.map((l) => versCarte(l, aimees, voisinage, 'image'));
  const cartesTexte = textes.lignes.map((l) => versCarte(l, aimees, voisinage, 'texte'));

  return {
    cartes: entrelacer(cartesImage, cartesTexte),
    // Il reste quelque chose tant que l'un des deux viviers n'est pas
    // epuise : le feed ne s'arrete pas parce que les images manquent.
    suite: images.suite || textes.suite ? { image: images.suite, texte: textes.suite } : null,
  };
}

/**
 * Sept images, puis trois textes, mais pas en bloc.
 *
 * Les trois cartes texte sont reparties dans le palier plutot que posees a
 * la suite : trois ecrans de texte d'affilee cassent le rythme d'une page
 * qu'on parcourt pour regarder. Une tous les trois visuels environ.
 */
function entrelacer(images: CarteDecouverte[], textes: CarteDecouverte[]): CarteDecouverte[] {
  if (textes.length === 0) return images;
  if (images.length === 0) return textes;

  const melange: CarteDecouverte[] = [];
  const pas = Math.max(1, Math.ceil(images.length / (textes.length + 1)));
  let prochainTexte = 0;

  images.forEach((carte, rang) => {
    melange.push(carte);
    if ((rang + 1) % pas === 0 && prochainTexte < textes.length) {
      melange.push(textes[prochainTexte]!);
      prochainTexte += 1;
    }
  });

  // Ce qui n'a pas trouve sa place ferme le palier plutot que d'etre perdu.
  return [...melange, ...textes.slice(prochainTexte)];
}

async function lireUnVivier(
  vivier: 'images' | 'textes',
  depuis: { rang: number; id: string } | null,
  limite: number,
): Promise<{ lignes: LigneDecouverte[]; suite: { rang: number; id: string } | null }> {
  const supabase = await createClient();

  let requete = supabase
    .from('prompts')
    .select(vivier === 'images' ? COLONNES_IMAGE : COLONNES)
    .eq('status', 'published');

  if (vivier === 'images') {
    // La jointure interne fait office de filtre : une commande sans
    // « apres » ne remonte pas du tout, et le palier garde sa taille.
    requete = requete.eq('library', 'images').eq('prompt_media.kind', 'after');
  } else {
    // Textes et Reflexions ensemble : ce sont les deux facons de se servir
    // de l'outil sans image a la sortie.
    requete = requete.in('library', ['textes', 'reflexions']);
  }

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
  aimees: Set<string>,
  voisinage: Map<string, CarteVoisine[]>,
  genre: 'image' | 'texte',
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
    description: ligne.short_description || (ligne.result_summary ?? ''),
    genre,
    // Le detail ne voyage que pour une carte texte : c'est elle qui
    // l'affiche, et l'embarquer pour sept cartes image par palier
    // alourdirait chaque chargement sans rien montrer de plus.
    detail: genre === 'texte' ? (ligne.intention ?? ligne.result_summary ?? '') : '',
    bibliotheque: ligne.library ? (LIBRARY_LABELS[ligne.library] ?? null) : null,
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
    likeCount: ligne.like_count ?? 0,
    aime: aimees.has(ligne.id),
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
 * Ce que le membre courant a deja aime, parmi les cartes de ce palier.
 *
 * Une seule lecture bornee aux identifiants affiches, et non un drapeau par
 * carte : dix lectures par palier pour une information qui tient en une.
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
 * autrement que « le catalogue est vide ». Les textes comptent aussi :
 * depuis qu'ils entrent dans le feed, une bibliotheque sans une seule image
 * a quand meme quelque chose a montrer.
 */
export const compterLesVisuels = cache(async (): Promise<number> => {
  const supabase = await createClient();

  const [images, textes] = await Promise.all([
    supabase
      .from('prompts')
      .select('id, prompt_media!inner(kind)', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('library', 'images')
      .eq('prompt_media.kind', 'after'),
    supabase
      .from('prompts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .in('library', ['textes', 'reflexions']),
  ]);

  return (images.count ?? 0) + (textes.count ?? 0);
});
