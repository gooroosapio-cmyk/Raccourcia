import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getAccessState } from '@/lib/access/entitlement';
import {
  CATALOG_PAGE_SIZE,
  CONFIG_FALLBACKS,
  CONFIG_KEYS,
  LEGAL_KEYS,
  MODES,
  type LegalKey,
  type Mode,
} from '@/lib/constants';
import type { InputExampleKind, OutputFormatKind } from '@/lib/constants';
import { clesDeTri } from '@/lib/catalog/tri';
import { modesLisibles } from '@/lib/catalog/modes';
import { normaliserRecherche, portesDeRecherche } from '@/lib/catalog/recherche';
import type {
  BeforeAfter,
  CategoryNode,
  LibraryFamily,
  PromptCard,
  PromptDetail,
} from '@/lib/catalog/types';
import type { Enums } from '@/lib/supabase/database.types';
import type { CatalogQuery } from '@/lib/validation/schemas';
import { CatalogUnavailableError } from '@/lib/catalog/errors';
import { LARGEURS_VISUEL, urlVisuel } from '@/lib/media/url';

/**
 * Configuration runtime publique. Activer le mode Analyse ou fermer les pages
 * publiques se fait ici, sans redeploiement.
 */
export const getPublicConfig = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from('app_config').select('key, value').eq('is_public', true);

  const read = <T>(key: string, fallback: T): T => {
    const row = data?.find((entry) => entry.key === key);
    return (row?.value as T) ?? fallback;
  };

  const regular = read<number>(
    CONFIG_KEYS.PRICE_REGULAR,
    CONFIG_FALLBACKS[CONFIG_KEYS.PRICE_REGULAR],
  );
  const current = read<number>(
    CONFIG_KEYS.PRICE_CURRENT,
    CONFIG_FALLBACKS[CONFIG_KEYS.PRICE_CURRENT],
  );

  return {
    publicCatalogEnabled: read<boolean>(
      CONFIG_KEYS.PUBLIC_CATALOG_ENABLED,
      CONFIG_FALLBACKS[CONFIG_KEYS.PUBLIC_CATALOG_ENABLED],
    ),
    purchaseUrl: read<string>(CONFIG_KEYS.PURCHASE_URL, CONFIG_FALLBACKS[CONFIG_KEYS.PURCHASE_URL]),
    price: {
      current,
      // Un prix de reference n'est barre que s'il est reellement superieur.
      // Barrer un montant egal ou inferieur serait une fausse remise.
      regular: regular > current ? regular : null,
      currency: read<string>(
        CONFIG_KEYS.PRICE_CURRENCY,
        CONFIG_FALLBACKS[CONFIG_KEYS.PRICE_CURRENCY],
      ),
    },
  };
});

/**
 * Informations legales de l'editeur.
 *
 * Une valeur absente reste absente : la page publique affiche alors une
 * mention "a completer" explicite. Inventer une raison sociale ou une adresse
 * serait plus grave qu'une page visiblement inachevee.
 */
export const getLegalInfo = cache(async (): Promise<Record<LegalKey, string>> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', LEGAL_KEYS as unknown as string[]);

  const entries = LEGAL_KEYS.map((key) => {
    const row = data?.find((entry) => entry.key === key);
    const value = typeof row?.value === 'string' ? row.value.trim() : '';
    return [key, value] as const;
  });

  return Object.fromEntries(entries) as Record<LegalKey, string>;
});

/**
 * Domaines proposes dans la bibliotheque.
 *
 * Le catalogue v2.0 n'en expose que deux : l'analyse est devenue une
 * sous-categorie de Texte, elle n'a plus de segment propre (Regles R01, R03).
 */
export function getAvailableModes(): readonly Mode[] {
  return MODES;
}

/**
 * Categories visibles d'un mode, avec leurs sous-categories.
 * La RLS filtre deja les categories masquees : une categorie desactivee
 * n'arrive tout simplement pas ici.
 */
export const getCategories = cache(async (mode: Enums<'app_mode'>): Promise<CategoryNode[]> => {
  const supabase = await createClient();
  // La visibilite est filtree ici, explicitement, et non laissee a la RLS.
  // Sa clause est `is_visible or is_admin()` : sans ce filtre, un
  // administrateur qui parcourt la bibliotheque voit les categories
  // archivees que personne d'autre ne voit, et la navigation change de forme
  // selon qui regarde.
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name, short_description, mode, parent_id, sort_order')
    .eq('mode', mode)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  if (error) throw new CatalogUnavailableError(error);

  const rows = data ?? [];
  return rows
    .filter((row) => row.parent_id === null)
    .map((parent) => ({
      id: parent.id,
      slug: parent.slug,
      name: parent.name,
      // Ce a quoi sert la famille. Sert de sous-titre aux raccourcis
      // d'intention, qui sans elle ne seraient qu'une seconde rangee de chips.
      description: parent.short_description?.trim() ?? '',
      mode: parent.mode,
      children: rows
        .filter((child) => child.parent_id === parent.id)
        .map((child) => ({ id: child.id, slug: child.slug, name: child.name })),
    }));
});

/**
 * La Bibliotheque : les familles, leurs collections, et de quoi les dessiner.
 *
 * Trois lectures, jamais une par tuile : les rayons visibles, le nombre de
 * commandes publiees par rayon, et un visuel par collection. Cinquante-trois
 * tuiles qui iraient chacune chercher son image feraient cinquante-trois
 * requetes pour une seule page.
 *
 * Le visuel d'une collection est celui d'une de ses commandes — la premiere
 * dans l'ordre du catalogue qui en porte un. Le catalogue V2 arrive sans
 * images : la plupart des tuiles n'en auront pas, et l'ecran le prevoit.
 */
/**
 * Combien d'apercus composent une couverture.
 *
 * Trois : un grand a gauche, deux petits a droite. Au-dela, chaque vignette
 * devient trop petite pour qu'on y reconnaisse quoi que ce soit sur un ecran
 * de 360 px, ou une tuile fait 170 px de large.
 */
const APERCUS_PAR_COUVERTURE = 3;

export const getBibliotheque = cache(async (): Promise<LibraryFamily[]> => {
  const supabase = await createClient();

  const [{ data: rayons, error }, { data: commandes }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, slug, name, short_description, mode, parent_id, sort_order')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('prompts')
      .select('category_id, sort_order, prompt_media(kind, storage_path, sort_order)')
      .eq('status', 'published')
      .order('sort_order', { ascending: true }),
  ]);

  // Les types generes ne declarent pas la relation prompts -> prompt_media :
  // le reste du fichier fait de meme pour les cartes.
  type LigneVisuel = {
    category_id: string | null;
    prompt_media: { kind: string; storage_path: string; sort_order: number }[] | null;
  };

  if (error) throw new CatalogUnavailableError(error);

  const lignes = rayons ?? [];

  // Ce que chaque rayon contient, et les premieres images qu'on y trouve.
  //
  // Trois et non une : une couverture faite d'un seul visuel ne dit rien de
  // ce qu'il y a derriere, et deux rayons voisins peuvent tomber sur la meme.
  // Trois apercus reellement tires de la collection en montrent la variete —
  // et rendent la collision beaucoup moins probable.
  const comptes = new Map<string, number>();
  const visuels = new Map<string, string[]>();
  for (const commande of (commandes ?? []) as unknown as LigneVisuel[]) {
    if (!commande.category_id) continue;
    comptes.set(commande.category_id, (comptes.get(commande.category_id) ?? 0) + 1);
    const deja = visuels.get(commande.category_id) ?? [];
    if (deja.length >= APERCUS_PAR_COUVERTURE) continue;
    const media = (commande.prompt_media ?? [])
      .filter((m) => m.kind === 'after' || m.kind === 'thumbnail')
      .sort((a, b) => a.sort_order - b.sort_order)[0];
    if (!media) continue;
    const url = urlVisuel(media.storage_path, LARGEURS_VISUEL.vignette);
    if (deja.includes(url)) continue;
    visuels.set(commande.category_id, [...deja, url]);
  }

  // Ce qu'une couverture a deja pris, par grille.
  //
  // Deux familles qui montrent la meme image se lisent comme un doublon, meme
  // quand leurs contenus n'ont rien a voir : c'etait le cas de « Produit et
  // e-commerce » et de « Publicité et marque ». Le premier rayon dans l'ordre
  // du catalogue garde l'image, le suivant descend a l'apercu d'apres.
  //
  // Une reserve par grille et non une seule : une famille et l'une de ses
  // collections ne se regardent jamais cote a cote — la tuile de famille est
  // en bibliotheque, ses collections a l'etage d'en dessous. Leur interdire
  // la meme image priverait de couverture les collections d'une famille qui
  // n'a qu'un seul visuel.
  const reserver = (prises: Set<string>, candidates: string[]): string[] => {
    const retenues = candidates.filter((url) => !prises.has(url)).slice(0, APERCUS_PAR_COUVERTURE);
    // Plutot rien qu'une image deja vue a cote : la tuile typographique est un
    // parti pris, un doublon est une erreur.
    for (const url of retenues) prises.add(url);
    return retenues;
  };

  const prisesParLesFamilles = new Set<string>();

  return (
    lignes
      .filter((rayon) => rayon.parent_id === null)
      .map((famille) => {
        const enfants = lignes.filter((rayon) => rayon.parent_id === famille.id);

        const apercusFamille = reserver(prisesParLesFamilles, [
          ...(visuels.get(famille.id) ?? []),
          ...enfants.flatMap((collection) => visuels.get(collection.id) ?? []),
        ]);

        const prisesParLesCollections = new Set<string>();
        const collections = enfants.map((collection) => ({
          id: collection.id,
          slug: collection.slug,
          name: collection.name,
          count: comptes.get(collection.id) ?? 0,
          apercus: reserver(prisesParLesCollections, visuels.get(collection.id) ?? []),
        }));

        return {
          id: famille.id,
          slug: famille.slug,
          name: famille.name,
          description: famille.short_description?.trim() ?? '',
          mode: famille.mode,
          // Les commandes rangees directement dans la famille comptent aussi :
          // toutes les taxonomies n'ont pas deux niveaux.
          count:
            (comptes.get(famille.id) ?? 0) + collections.reduce((total, c) => total + c.count, 0),
          apercus: apercusFamille,
          collections,
        };
      })
      // Une famille sans rien a montrer n'a pas de tuile a offrir.
      .filter((famille) => famille.count > 0)
  );
});

/**
 * Colonnes du comptage.
 *
 * Rien que l'identifiant, plus la jointure quand un filtre porte dessus. Une
 * imbrication ne multiplie pas les lignes du niveau superieur : `count=exact`
 * compte bien les raccourcis, pas les variantes.
 *
 * La jointure est **conditionnelle**, et c'est tout l'enjeu. Ecrite en dur,
 * elle ne comptait que les commandes rattachees a un fournisseur : le
 * catalogue V2 arrive sans variantes, la liste en montrait dix-huit et le
 * total en annoncait deux. La lecture, elle, etait passee en jointure
 * externe lors de la refonte — les deux requetes ne parlaient plus du meme
 * catalogue. Une jointure sert un filtre ; sans le filtre, elle n'a rien a
 * faire la.
 */
function colonnesDuComptage(filtreFournisseur: boolean): string {
  return filtreFournisseur ? 'id, prompt_variants!inner(ai_providers!inner(key))' : 'id';
}

/** Colonnes publiques d'un raccourci. `payload` n'y figure jamais. */
/**
 * Colonnes d'une carte de galerie.
 *
 * `prompt_variants` est une jointure externe, et non interne comme
 * auparavant : une carte du catalogue V2 existe avant son texte, donc avant
 * ses variantes. La reserver a celles qui ont deja un moteur ferait
 * disparaitre six cents cartes de la galerie. C'est `payload_ready` qui dit
 * si la commande se copie, et l'ecran s'y fie.
 *
 * Rien de premium ne passe ici : le payload n'est jamais selectionne.
 */
const CARD_COLUMNS = `
  id, command, name, slug, mode, short_description, result_summary, use_cases, tags,
  show_image_card, payload_ready, cta_label, entity_type, images_min, default_ratio,
  is_free, is_new, is_featured, risk_level, sort_order,
  level, max_questions,
  intention, expected_input, limitations, required_variables,
  input_examples, output_formats,
  categories(slug, name),
  prompt_variants(compatibility, status, ai_providers(key, name, is_active)),
  prompt_media(kind, storage_path, alt, sort_order),
  prompt_aliases!prompt_aliases_canonical_prompt_id_fkey(preset)
`;

type CardRow = {
  id: string;
  command: string;
  name: string;
  slug: string;
  mode: Enums<'app_mode'>;
  short_description: string;
  result_summary: string | null;
  input_examples: InputExampleKind[] | null;
  output_formats: OutputFormatKind[] | null;
  use_cases: string[];
  tags: string[];
  show_image_card: boolean;
  payload_ready: boolean;
  entity_type: string | null;
  images_min: number | null;
  default_ratio: string | null;
  categories: { slug: string; name: string } | null;
  cta_label: string | null;
  is_free: boolean;
  is_new: boolean;
  is_featured: boolean;
  risk_level: Enums<'risk_level'>;
  level: Enums<'execution_level'> | null;
  max_questions: number | null;
  prompt_aliases: { preset: unknown }[] | null;
  intention: string | null;
  expected_input: string | null;
  limitations: string | null;
  required_variables: string[];
  prompt_variants: {
    compatibility: Enums<'compatibility_level'>;
    status: Enums<'content_status'>;
    ai_providers: { key: string; name: string; is_active: boolean } | null;
  }[];
  prompt_media: {
    kind: Enums<'media_kind'>;
    storage_path: string;
    alt: string | null;
    sort_order: number;
  }[];
};

/**
 * Comparaison Avant/Apres, ou rien.
 *
 * Les deux visuels sont exiges ensemble. Retomber sur l'image d'entree faute
 * de resultat afficherait une transformation qui n'a pas eu lieu ; c'est le
 * seul cas ou ne rien montrer vaut mieux que montrer quelque chose.
 */
function toBeforeAfter(media: CardRow['prompt_media']): BeforeAfter | null {
  const pick = (kind: Enums<'media_kind'>) =>
    (media ?? [])
      .filter((entry) => entry.kind === kind)
      .sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;

  const before = pick('before');
  const after = pick('after');
  if (!before || !after) return null;

  return {
    beforeUrl: urlVisuel(before.storage_path, LARGEURS_VISUEL.comparaison),
    beforeAlt: before.alt ?? 'Visuel de départ',
    afterUrl: urlVisuel(after.storage_path, LARGEURS_VISUEL.comparaison),
    afterAlt: after.alt ?? 'Résultat obtenu avec la commande',
  };
}

function toCard(row: CardRow, favorites: Set<string>): PromptCard {
  // L'Apres prime : c'est le resultat, donc ce qui fait choisir. La miniature
  // ne sert que de repli pour les raccourcis qui en ont une sans paire.
  const parType = (kind: Enums<'media_kind'>) =>
    (row.prompt_media ?? [])
      .filter((media) => media.kind === kind)
      .sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;

  const thumbnail = parType('after') ?? parType('thumbnail');
  const comparaison = toBeforeAfter(row.prompt_media);

  return {
    id: row.id,
    command: row.command,
    name: row.name,
    slug: row.slug,
    mode: row.mode,
    shortDescription: row.short_description,
    // La promesse de resultat prime ; a defaut, la description courte, qui
    // dit deja ce que le raccourci fait.
    resultSummary: row.result_summary?.trim() || row.short_description,
    beforeAfter: comparaison,
    inputExamples: row.input_examples ?? [],
    outputFormats: row.output_formats ?? [],
    useCases: row.use_cases ?? [],
    tags: row.tags ?? [],
    showImageCard: row.show_image_card,
    entityType: (row.entity_type as PromptCard['entityType']) ?? null,
    collectionSlug: row.categories?.slug ?? null,
    collectionName: row.categories?.name ?? null,
    imagesMin: row.images_min,
    defaultRatio: row.default_ratio,
    payloadReady: row.payload_ready,
    ctaLabel: row.cta_label,
    isFree: row.is_free,
    isNew: row.is_new,
    isFeatured: row.is_featured,
    riskLevel: row.risk_level,
    level: row.level,
    maxQuestions: row.max_questions,
    modes: modesLisibles((row.prompt_aliases ?? []).map((entree) => entree.preset)),
    thumbnailUrl: thumbnail ? urlVisuel(thumbnail.storage_path, LARGEURS_VISUEL.vignette) : null,
    thumbnailAlt: thumbnail?.alt ?? null,
    providers: (row.prompt_variants ?? [])
      .filter((variant) => variant.status === 'published' && variant.ai_providers?.is_active)
      .map((variant) => ({
        key: variant.ai_providers!.key,
        name: variant.ai_providers!.name,
        compatibility: variant.compatibility,
      })),
    isFavorite: favorites.has(row.id),
    intention: row.intention,
    expectedInput: row.expected_input,
    limitations: row.limitations,
    requiredVariables: row.required_variables ?? [],
  };
}

/** Favoris du membre courant, sous forme d'ensemble pour un rendu direct. */
async function getFavoriteIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase.from('favorites').select('prompt_id');
  return new Set((data ?? []).map((row) => row.prompt_id));
}

export type CatalogPage = {
  items: PromptCard[];
  hasMore: boolean;
  /**
   * Nombre de raccourcis que la selection contient reellement, et non le
   * nombre de cartes chargees. Le panneau de filtres annonce ce chiffre
   * avant de valider : compter les cartes deja a l'ecran aurait dit « 20 »
   * quoi qu'il arrive.
   */
  total: number;
};

/**
 * Retire le nom d'une commande verrouillee avant l'envoi au navigateur.
 *
 * Ne pas l'afficher ne suffit pas : la carte est un composant client, donc
 * tout ce qu'elle recoit voyage dans la charge de la page et se lit dans le
 * code source. Un visiteur y retrouvait `/luxmockup` sans meme cliquer.
 *
 * Le nom part donc du serveur, pas de la feuille de style. Le `slug` suit :
 * il porte le meme mot, et menerait a la page publique de la commande.
 *
 * Un membre garde tout : il a paye, et la question ne se pose pas pour lui.
 * Les commandes offertes aussi — ce sont elles qui demontrent le produit.
 */
function masquerCommande(card: PromptCard): PromptCard {
  const commande = card.command.trim();
  if (!commande) return card;

  // Les textes du catalogue citent la commande dans leurs propres phrases
  // (« /luxmockup sur une photo produit pour obtenir... »). Retirer le champ
  // sans nettoyer les phrases laissait le nom lisible a deux lignes de la.
  const motif = new RegExp(`${commande.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  const nettoyer = (texte: string) => texte.replace(motif, 'la commande');
  const nettoyerOuNull = (texte: string | null) => (texte === null ? null : nettoyer(texte));

  return {
    ...card,
    command: '',
    slug: '',
    // Les etiquettes ne sont affichees nulle part et portent parfois le mot
    // de la commande : elles n'ont aucune raison de voyager jusqu'ici.
    tags: [],
    // Les modes ne s'affichent que sur la fiche, et une carte masquee
    // n'ouvre pas de fiche : ils n'ont rien a faire dans la page.
    modes: [],
    shortDescription: nettoyer(card.shortDescription),
    resultSummary: nettoyer(card.resultSummary),
    useCases: card.useCases.map(nettoyer),
    thumbnailAlt: nettoyerOuNull(card.thumbnailAlt),
    intention: nettoyerOuNull(card.intention),
    expectedInput: nettoyerOuNull(card.expectedInput),
    limitations: nettoyerOuNull(card.limitations),
  };
}

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Identifiants couverts par un slug de categorie, sous-categories comprises.
 *
 * `null` quand aucune categorie n'est demandee. Un tableau vide quand le slug
 * ne correspond a rien : l'appelant sait alors qu'il n'y a rien a chercher,
 * au lieu d'afficher tout le catalogue.
 */
async function resoudreCategorie(client: Client, slug?: string): Promise<string[] | null> {
  if (!slug) return null;

  const { data: categorie } = await client
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (!categorie) return [];

  const { data: enfants } = await client
    .from('categories')
    .select('id')
    .eq('parent_id', categorie.id);

  return [categorie.id, ...(enfants ?? []).map((enfant) => enfant.id)];
}

/**
 * Familles dont le nom ou la description repond au terme cherche.
 *
 * Sans elles, taper « portrait » ne ramenait que les commandes portant le mot
 * dans leur titre, et pas les soixante-deux de la famille Portrait.
 */
async function categoriesParRecherche(
  client: Client,
  /** `null` pour chercher dans tous les domaines. */
  mode: Enums<'app_mode'> | null,
  terme: string,
): Promise<string[]> {
  let requete = client
    .from('categories')
    .select('id')
    .eq('is_visible', true)
    .ilike('search_norm', `%${terme}%`);

  if (mode) requete = requete.eq('mode', mode);

  const { data } = await requete;

  const trouvees = (data ?? []).map((ligne) => ligne.id);
  if (trouvees.length === 0) return [];

  // Une famille trouvee amene ses sous-categories, comme le fait le filtre
  // par categorie : sans cela, chercher « portrait » raterait les raccourcis
  // ranges un niveau plus bas.
  const { data: enfants } = await client.from('categories').select('id').in('parent_id', trouvees);

  return [...trouvees, ...(enfants ?? []).map((enfant) => enfant.id)];
}

/**
 * Bibliotheque paginee. On ne renvoie jamais tout le catalogue d'un coup
 * (Blueprint Backend V1, 11.3).
 */
export async function getCatalogPage(query: CatalogQuery): Promise<CatalogPage> {
  const supabase = await createClient();
  const favorites = await getFavoriteIds();
  // Memoise par requete : l'appel ci-dessous ne coute rien de plus a la page,
  // qui interroge deja l'etat d'acces en parallele.
  const { isMember, hasFullAccess } = await getAccessState();
  const visiteur = !isMember;

  const pageSize = query.pageSize ?? CATALOG_PAGE_SIZE;
  const from = (query.page - 1) * pageSize;

  const categorieIds = await resoudreCategorie(supabase, query.categorySlug);
  if (categorieIds && categorieIds.length === 0) {
    return { items: [], hasMore: false, total: 0 };
  }

  // Une recherche porte aussi sur le nom des familles : taper « portrait »
  // doit ramener la famille entiere, pas seulement les commandes dont le
  // titre contient le mot.
  const terme = query.search ? normaliserRecherche(query.search) : '';
  // Une recherche a l'echelle du catalogue ne se borne pas au domaine : ni
  // pour les commandes, ni pour les familles qu'on peut chercher par leur nom.
  const transverse = query.portee === 'catalogue';
  const famillesTrouvees = terme
    ? await categoriesParRecherche(supabase, transverse ? null : query.mode, terme)
    : [];

  // Une seule construction pour la lecture et pour le comptage : deux chaines
  // de filtres separees auraient fini par annoncer un total qui ne correspond
  // plus a la liste montree. Les colonnes sont le seul parametre, ce qui
  // permet au comptage de ne rien ramener du tout.
  const construire = (colonnes: string, tete = false) => {
    let requete = supabase
      .from('prompts')
      .select(colonnes as '*', tete ? { count: 'exact', head: true } : undefined)
      .eq('status', 'published');

    if (!transverse) requete = requete.eq('mode', query.mode);

    if (categorieIds) requete = requete.in('category_id', categorieIds);

    if (terme) requete = requete.or(portesDeRecherche(terme, famillesTrouvees));

    if (query.provider) requete = requete.eq('prompt_variants.ai_providers.key', query.provider);
    if (query.access) requete = requete.eq('is_free', query.access === 'gratuit');
    if (query.output) {
      // `contains` sur un tableau : une commande peut produire plusieurs
      // formats, on garde celles qui produisent au moins celui demande.
      requete = requete.contains('output_formats', [query.output]);
    }

    return requete;
  };

  let request = construire(CARD_COLUMNS);

  // L'ordre vit dans `lib/catalog/tri.ts`, ou il se lit sans base et ou un
  // test le verrouille : c'est la regle la plus facile a casser sans s'en
  // apercevoir, une liste restant une liste meme mal triee.
  for (const cle of clesDeTri(query.sort, isMember)) {
    request = request.order(cle.colonne, {
      ascending: cle.ascendant,
      nullsFirst: cle.nullsFirst,
    });
  }

  // On demande un element de plus pour savoir s'il reste une page. Le total
  // vient d'un comptage separe, construit par la meme fonction : le chiffre
  // annonce ne peut pas s'ecarter de la liste montree.
  const [lecture, comptage] = await Promise.all([
    request.range(from, from + pageSize),
    // La jointure doit figurer dans le comptage quand — et seulement quand —
    // le filtre porte sur `prompt_variants.ai_providers.key` : sans elle
    // PostgREST rejette la requete, avec elle sans filtre le total oublie
    // toutes les commandes sans variante.
    construire(colonnesDuComptage(Boolean(query.provider)), true),
  ]);

  if (lecture.error) throw new CatalogUnavailableError(lecture.error);

  const rows = (lecture.data ?? []) as unknown as CardRow[];

  const items = rows.slice(0, pageSize).map((row) => {
    const card = toCard(row, favorites);
    const verrouille = !hasFullAccess && !card.isFree;
    return visiteur && verrouille ? masquerCommande(card) : card;
  });

  return {
    items,
    hasMore: rows.length > pageSize,
    total: comptage.count ?? items.length,
  };
}

/**
 * Raccourcis mis en avant sur la page de vente.
 *
 * Choisis par commande et non par identifiant : republier une entree change
 * son identifiant, jamais sa commande. Une commande absente du catalogue est
 * simplement omise — la page de vente ne montre que ce qui existe vraiment.
 *
 * Le masquage de la bibliotheque s'applique ici aussi : un raccourci reserve
 * ne livre pas son nom a qui n'a pas d'acces. Une page de vente n'est pas une
 * exception a cette regle, c'est meme la ou elle compte le plus.
 */
/** Categorie telle que la page de vente la presente : un nom, un volume. */
export type CategorieVitrine = {
  mode: Mode;
  nom: string;
  /** A quoi sert la categorie, telle qu'elle est decrite au catalogue. */
  description: string;
  raccourcis: number;
};

/**
 * Categories publiees, avec le nombre de raccourcis de chacune.
 *
 * Lues et non recopiees. Une page de vente qui annonce ses rayons de memoire
 * finit toujours par en promettre un que la bibliotheque n'a plus : ici, ce
 * qui est affiche est exactement ce que le visiteur trouvera en entrant.
 *
 * Le comptage se fait sur les identifiants seuls — trois cents lignes de deux
 * colonnes — plutot qu'en interrogeant la base une fois par categorie.
 */
export async function getCategoriesVitrine(): Promise<CategorieVitrine[]> {
  const supabase = await createClient();

  const [{ data: categories, error }, { data: prompts }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, short_description, mode, parent_id, sort_order')
      .eq('is_visible', true)
      .is('parent_id', null)
      .order('sort_order'),
    supabase.from('prompts').select('category_id').eq('status', 'published'),
  ]);

  if (error) throw new CatalogUnavailableError(error);

  const parCategorie = new Map<string, number>();
  for (const prompt of prompts ?? []) {
    if (!prompt.category_id) continue;
    parCategorie.set(prompt.category_id, (parCategorie.get(prompt.category_id) ?? 0) + 1);
  }

  return (
    (categories ?? [])
      .filter((categorie): categorie is typeof categorie & { mode: Mode } =>
        MODES.includes(categorie.mode as Mode),
      )
      .map((categorie) => ({
        mode: categorie.mode,
        nom: categorie.name,
        description: categorie.short_description?.trim() ?? '',
        raccourcis: parCategorie.get(categorie.id) ?? 0,
      }))
      // Une categorie vide n'a rien a vendre : elle promettrait un rayon que le
      // visiteur trouverait desert.
      .filter((categorie) => categorie.raccourcis > 0)
  );
}

/** Question contextuelle d'un raccourci, telle qu'elle est stockee. */
export type QuestionExemple = { question: string; choices: string[] };

/**
 * Une question contextuelle reelle, pour illustrer la page de vente.
 *
 * Elle est lue et non ecrite en dur : montrer une question inventee ferait
 * promettre un comportement que le catalogue ne porte pas.
 */
export async function getQuestionExemple(command: string): Promise<QuestionExemple | null> {
  const supabase = await createClient();

  // Deux lectures plutot qu'une jointure : la jointure imbriquee ne se type
  // pas proprement et ferait perdre plus de temps qu'elle n'en fait gagner
  // sur deux lignes.
  const { data: prompt } = await supabase
    .from('prompts')
    .select('id')
    .eq('command', command)
    .eq('status', 'published')
    .maybeSingle();

  if (!prompt) return null;

  const { data } = await supabase
    .from('prompt_questions')
    .select('question, choices')
    .eq('prompt_id', prompt.id)
    .eq('is_active', true)
    .order('sort_order')
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const choices = Array.isArray(data.choices)
    ? data.choices.filter((choix): choix is string => typeof choix === 'string')
    : [];

  return { question: data.question, choices };
}

/** Fiche detaillee. Le prompt complet reste absent : il passe par resolve. */
export async function getPromptDetail(slug: string): Promise<PromptDetail | null> {
  const supabase = await createClient();
  const favorites = await getFavoriteIds();

  const { data, error } = await supabase
    .from('prompts')
    .select(`${CARD_COLUMNS}, expected_output, categories(name)`)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  // Une base injoignable n'est pas un raccourci inexistant : on remonte
  // l'incident plutot que d'afficher une page "introuvable" trompeuse.
  if (error) throw new CatalogUnavailableError(error);
  if (!data) return null;

  const row = data as unknown as CardRow & {
    expected_output: string | null;
    categories: { name: string } | null;
  };

  return {
    ...toCard(row, favorites),
    expectedOutput: row.expected_output,
    categoryName: row.categories?.name ?? null,
    media: (row.prompt_media ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((media) => ({
        kind: media.kind,
        url: urlVisuel(media.storage_path, LARGEURS_VISUEL.comparaison),
        alt: media.alt,
      })),
  };
}

/**
 * Adresse courante d'une commande qu'on cherche sous un ancien nom.
 *
 * Un lien comme /r/adsocial a pu partir par message il y a des semaines. Le
 * raccourci est devenu un mode d'une commande plus large ; la page doit
 * conduire la ou le travail se fait, pas afficher « introuvable ».
 *
 * `null` quand rien ne correspond : la page reste alors introuvable, ce qui
 * est la bonne reponse pour une adresse qui n'a jamais existe.
 */
export async function getAliasDestination(
  slug: string,
): Promise<{ slug: string; mode: string | null } | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('resoudre_alias', { p_slug: slug });
  const destination = error ? undefined : data?.[0];
  if (!destination) return null;

  const preset = destination.preset as Record<string, unknown> | null;
  const mode = typeof preset?.mode === 'string' ? preset.mode : null;

  return { slug: destination.slug, mode };
}

/** Vue Favoris : exactement les memes cartes que Decouvrir. */
export async function getFavorites(): Promise<PromptCard[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from('favorites')
    .select('prompt_id')
    .order('created_at', { ascending: false });

  if (error) throw new CatalogUnavailableError(error);

  const ids = (rows ?? []).map((row) => row.prompt_id);
  if (ids.length === 0) return [];

  const { data } = await supabase.from('prompts').select(CARD_COLUMNS).in('id', ids);
  const favorites = new Set(ids);
  const cards = ((data ?? []) as unknown as CardRow[]).map((row) => toCard(row, favorites));
  // Conserver l'ordre "ajoute recemment d'abord".
  return ids.map((id) => cards.find((card) => card.id === id)).filter((card) => card !== undefined);
}

/**
 * Une rangee de l'Accueil : quelques commandes choisies, tous domaines
 * confondus.
 *
 * `getCatalogPage` ne sait travailler que dans un domaine a la fois, parce
 * que la bibliotheque se parcourt domaine par domaine. L'Accueil, lui,
 * presente : « Selection du moment » n'a pas a demander si l'on cherche une
 * image ou un texte.
 *
 * Deux rangees, deux criteres, et rien d'invente : la mise en avant vient du
 * catalogue, les nouveautes de la date de publication. Il n'y a pas de
 * rangee « les plus utilisees » — le compte des copies vit dans
 * `copy_events`, ferme au membre, et une popularite devinee vaudrait moins
 * que pas de rangee du tout.
 */
export async function getRangeeAccueil(
  critere: 'mise-en-avant' | 'nouveautes',
  limite = 8,
): Promise<PromptCard[]> {
  const supabase = await createClient();
  const favorites = await getFavoriteIds();

  let requete = supabase
    .from('prompts')
    .select(CARD_COLUMNS)
    .eq('status', 'published')
    .limit(limite);

  if (critere === 'mise-en-avant') {
    // Une rangee de presentation sans image ne presente rien : on exige le
    // visuel plutot que de le preferer.
    requete = requete
      .eq('is_featured', true)
      .eq('media_ready', true)
      .order('sort_order', { ascending: true });
  } else {
    // Une nouveaute se montre : sans visuel, elle n'annonce rien et la
    // rangee ressemble a une liste de fiches vides.
    requete = requete
      .eq('media_ready', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('sort_order', { ascending: true });
  }

  // Derniere cle unique : sans elle, deux commandes ex aequo peuvent
  // s'echanger d'un chargement a l'autre, et la rangee semble bouger seule.
  const { data, error } = await requete.order('command', { ascending: true });
  if (error) throw new CatalogUnavailableError(error);

  return ((data ?? []) as unknown as CardRow[]).map((row) => toCard(row, favorites));
}

/**
 * Le vivier du feed de l'Accueil.
 *
 * La requete ne fait qu'une chose, mais elle la fait bien : elle ecarte tout
 * ce qui n'a rien a faire dans un espace editorial. Ce qui sort d'ici est
 * publie, range dans un rayon visible, et **porte un visuel**. Une carte
 * « Visuel a venir » dans un feed de decouverte donne l'impression d'un
 * catalogue en chantier — elle reste accessible en bibliotheque, ou son
 * absence d'image se comprend.
 *
 * `media_ready` est tenue par la base : elle vaut vrai des qu'une commande
 * image porte un visuel de resultat. C'est le meme critere que la vignette
 * des cartes, donc le feed ne peut pas afficher un cadre vide.
 *
 * L'ordre sort d'ici grossierement trie — mise en avant, poids editorial du
 * classeur, ordre du catalogue. C'est `ordonnerLeFeed` qui l'alterne
 * ensuite : une base sait trier par un score, pas dire « pas deux portraits
 * de suite ».
 */
export async function getVivierDuFeed(limite = 60): Promise<PromptCard[]> {
  const supabase = await createClient();
  const favorites = await getFavoriteIds();

  const { data, error } = await supabase
    .from('prompts')
    .select(CARD_COLUMNS)
    .eq('status', 'published')
    .eq('media_ready', true)
    // Ce qui est utilisable passe devant. Une commande sans texte a copier se
    // regarde mais ne se lance pas : la laisser ouvrir la galerie revient a
    // mettre en vitrine ce qu'on ne peut pas encore vendre.
    //
    // Devant, et non seule : le catalogue arrive par vagues et la plupart des
    // textes manquent encore. Les exclure viderait l'Accueil, ce qui est pire
    // qu'une carte qui dit franchement « Bientôt ». Elles restent donc
    // atteignables, mais apres.
    .order('payload_ready', { ascending: false })
    .order('is_featured', { ascending: false })
    .order('priority_score', { ascending: false, nullsFirst: false })
    .order('sort_order', { ascending: true })
    // Derniere cle unique : sans elle, deux ex aequo s'echangent d'un
    // chargement a l'autre et le feed semble bouger seul.
    .order('command', { ascending: true })
    .limit(limite);

  if (error) throw new CatalogUnavailableError(error);

  return ((data ?? []) as unknown as CardRow[]).map((row) => toCard(row, favorites));
}

/** Vue Recents : les raccourcis copies priment sur les simples consultations. */
export async function getRecents(): Promise<PromptCard[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from('recent_items')
    .select('prompt_id, last_copied_at, last_viewed_at')
    .limit(30);

  if (error) throw new CatalogUnavailableError(error);

  const ordered = (rows ?? [])
    .map((row) => ({
      id: row.prompt_id,
      at: row.last_copied_at ?? row.last_viewed_at ?? '',
      copied: row.last_copied_at !== null,
    }))
    .sort((a, b) => {
      if (a.copied !== b.copied) return a.copied ? -1 : 1;
      return b.at.localeCompare(a.at);
    });

  if (ordered.length === 0) return [];

  const favorites = await getFavoriteIds();
  const { data } = await supabase
    .from('prompts')
    .select(CARD_COLUMNS)
    .in(
      'id',
      ordered.map((entry) => entry.id),
    );

  const cards = ((data ?? []) as unknown as CardRow[]).map((row) => toCard(row, favorites));
  return ordered
    .map((entry) => cards.find((card) => card.id === entry.id))
    .filter((card) => card !== undefined);
}
