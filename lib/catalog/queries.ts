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
import { lireLeMoteur } from '@/lib/catalog/moteur';
import { normaliserRecherche, portesDeRecherche } from '@/lib/catalog/recherche';
import { melangerLeVivier } from '@/lib/catalog/feed';
import type {
  BeforeAfter,
  CategoryNode,
  ChampDeCommande,
  LibraryFamily,
  PromptCard,
  PromptDetail,
} from '@/lib/catalog/types';
import type { Enums } from '@/lib/supabase/database.types';
import type { CatalogQuery } from '@/lib/validation/schemas';
import { CatalogUnavailableError } from '@/lib/catalog/errors';
import { lireTousLesPaliers } from '@/lib/catalog/paliers';
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
      periode: read<string>(CONFIG_KEYS.PRICE_PERIOD, CONFIG_FALLBACKS[CONFIG_KEYS.PRICE_PERIOD]),
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

  const [{ data: rayons, error }, commandes] = await Promise.all([
    supabase
      .from('categories')
      .select('id, slug, name, short_description, mode, parent_id, sort_order')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true }),
    lireTousLesPaliers((debut, fin) =>
      supabase
        .from('prompts')
        .select('category_id, sort_order, prompt_media(kind, storage_path, sort_order)')
        .eq('status', 'published')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true })
        .range(debut, fin),
    ),
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
  for (const commande of commandes as unknown as LigneVisuel[]) {
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
          description: collection.short_description?.trim() ?? '',
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
function colonnesDuComptage(filtreFournisseur: boolean, filtreTag: boolean): string {
  const jointures = ['id'];
  if (filtreFournisseur) jointures.push('prompt_variants!inner(ai_providers!inner(key))');
  if (filtreTag) jointures.push(JOINTURE_TAG);
  return jointures.join(', ');
}

/**
 * La jointure qui porte le filtre par tag, sous un nom a elle.
 *
 * ALIASEE, ET C'EST NECESSAIRE. Les colonnes de carte embarquent deja
 * `prompt_tags(tags(...))` pour AFFICHER les tags d'une commande. Poser le
 * filtre sur cette imbrication-la la reduirait au tag filtre : une carte
 * trouvee par « portrait » n'afficherait plus que « portrait », et perdrait
 * les trois autres. L'alias donne une seconde jointure, interne celle-ci,
 * qui filtre sans rien retirer de ce qu'on montre.
 */
const JOINTURE_TAG = 'filtre_tag:prompt_tags!inner(tags!inner(slug))';

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
  show_image_card, payload_ready, cta_label, entity_type, images_min, default_ratio, witness_type,
  library,
  is_free, is_new, is_featured, risk_level, sort_order, like_count,
  level, max_questions,
  intention, expected_input, limitations, required_variables,
  input_examples, output_formats,
  contexte, specification, livrables, questions_cadrage, criteres_reussite, erreurs, regle_sortie,
  categories(slug, name),
  prompt_variants(compatibility, status, ai_providers(key, name, is_active)),
  prompt_media(kind, storage_path, alt, sort_order),
  prompt_aliases!prompt_aliases_canonical_prompt_id_fkey(preset),
  prompt_fields(cle, libelle, indication, kind, requis, position,
                prompt_field_choices(valeur, libelle, position)),
  prompt_tags(tags(slug, name, groupe))
`;

type CardRow = {
  id: string;
  command: string;
  name: string;
  slug: string;
  mode: Enums<'app_mode'>;
  library: Enums<'app_library'> | null;
  short_description: string;
  result_summary: string | null;
  input_examples: InputExampleKind[] | null;
  output_formats: OutputFormatKind[] | null;
  use_cases: string[];
  tags: string[];
  show_image_card: boolean;
  payload_ready: boolean;
  entity_type: string | null;
  witness_type: string | null;
  images_min: number | null;
  default_ratio: string | null;
  categories: { slug: string; name: string } | null;
  cta_label: string | null;
  is_free: boolean;
  is_new: boolean;
  is_featured: boolean;
  like_count: number | null;
  risk_level: Enums<'risk_level'>;
  level: Enums<'execution_level'> | null;
  max_questions: number | null;
  prompt_aliases: { preset: unknown }[] | null;
  prompt_fields:
    | {
        cle: string;
        libelle: string;
        indication: string | null;
        kind: Enums<'prompt_field_kind'>;
        requis: boolean;
        position: number;
        prompt_field_choices: { valeur: string; libelle: string; position: number }[] | null;
      }[]
    | null;
  prompt_tags: { tags: { slug: string; name: string; groupe: Enums<'tag_group'> } | null }[] | null;
  intention: string | null;
  expected_input: string | null;
  limitations: string | null;
  required_variables: string[];
  contexte: string | null;
  specification: string | null;
  livrables: string | null;
  questions_cadrage: string | null;
  criteres_reussite: string | null;
  erreurs: string | null;
  regle_sortie: string | null;
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

/**
 * Ce que le membre courant a marque sur les cartes.
 *
 * Deux ensembles et non un : un favori range pour soi, un « j'aime » dit
 * publiquement que la commande sert. Ils vivent dans deux tables, ils se
 * lisent en une fois, et la carte porte les deux.
 */
type MarquesDuMembre = { favoris: Set<string>; likes: Set<string> };

const SANS_MARQUE: MarquesDuMembre = { favoris: new Set(), likes: new Set() };

function toCard(row: CardRow, marques: MarquesDuMembre = SANS_MARQUE): PromptCard {
  // L'Apres prime : c'est le resultat, donc ce qui fait choisir. La miniature
  // ne sert que de repli pour les raccourcis qui en ont une sans paire.
  const parType = (kind: Enums<'media_kind'>) =>
    (row.prompt_media ?? [])
      .filter((media) => media.kind === kind)
      .sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;

  const thumbnail = parType('after') ?? parType('thumbnail');
  const comparaison = toBeforeAfter(row.prompt_media);
  const genre = (row.entity_type as PromptCard['entityType']) ?? null;

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
    entityType: genre,
    witnessType: row.witness_type ?? null,
    library: row.library ?? null,
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
    isFavorite: marques.favoris.has(row.id),
    // Le compte vient de la base, jamais d'un calcul ici : un declencheur
    // l'ecrit a chaque like, et le recalculer cote serveur ouvrirait la
    // porte a deux gestes simultanes comptes une seule fois.
    likeCount: row.like_count ?? 0,
    aime: marques.likes.has(row.id),
    intention: row.intention,
    expectedInput: row.expected_input,
    limitations: row.limitations,
    requiredVariables: row.required_variables ?? [],
    // Seuls les Modes IA et les Parcours emportent leur moteur : eux seuls
    // l'affichent, et une galerie de vingt-quatre commandes image le
    // transporterait pour rien.
    moteur: genre === 'mode_ia' || genre === 'parcours' ? lireLeMoteur(row) : null,
    champs: lireLesChamps(row),
    motsCles: lireLesMotsCles(row),
  };
}

/**
 * Les tags qu'une fiche affiche.
 *
 * Les groupes « bibliotheque » et « ia » sont ecartes : la fiche annonce
 * deja la bibliotheque par son rayon et les IA par le selecteur du pied.
 * Les repeter en bas sous forme de puces donnerait trois fois la meme
 * information a trois endroits.
 *
 * Six au plus. Une commande en porte neuf en moyenne ; au-dela de six, la
 * rangee se replie sur trois lignes dans la fiche et pese sur chaque page de
 * galerie pour un bloc qu'on ne lit qu'apres ouverture.
 */
function lireLesMotsCles(row: CardRow): { slug: string; nom: string }[] {
  return (row.prompt_tags ?? [])
    .map((entree) => entree.tags)
    .filter((tag): tag is { slug: string; name: string; groupe: Enums<'tag_group'> } =>
      Boolean(tag),
    )
    .filter((tag) => tag.groupe !== 'bibliotheque' && tag.groupe !== 'ia')
    .slice(0, 6)
    .map((tag) => ({ slug: tag.slug, nom: tag.name }));
}

/**
 * Les champs a remplir avant de copier, dans l'ordre pose en administration.
 *
 * La base borne deja leur nombre a trois et leur position a l'unicite ; on
 * ne refait pas ce controle ici. On ne garde que ce qui est utilisable : un
 * champ « liste » sans aucun choix ne se remplirait pas, et l'afficher
 * donnerait un formulaire dont un champ n'attend rien.
 */
function lireLesChamps(row: CardRow): ChampDeCommande[] {
  return (row.prompt_fields ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((champ) => ({
      cle: champ.cle,
      libelle: champ.libelle,
      indication: champ.indication,
      genre: champ.kind,
      requis: champ.requis,
      choix: (champ.prompt_field_choices ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((choix) => ({ valeur: choix.valeur, libelle: choix.libelle })),
    }))
    .filter((champ) => champ.genre !== 'liste' || champ.choix.length > 0);
}

/** Favoris du membre courant, sous forme d'ensemble pour un rendu direct. */
async function getMarquesDuMembre(): Promise<MarquesDuMembre> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Un visiteur n'a ni favori ni like : deux ensembles vides valent mieux
  // que deux requetes qui rendront vide de toute facon.
  if (!user) return SANS_MARQUE;

  // Les deux en parallele : elles ne se conditionnent pas, et les enchainer
  // ajouterait un aller-retour a chaque page de galerie.
  const [favoris, likes] = await Promise.all([
    supabase.from('favorites').select('prompt_id'),
    supabase.from('prompt_likes').select('prompt_id'),
  ]);

  return {
    favoris: new Set((favoris.data ?? []).map((row) => row.prompt_id)),
    likes: new Set((likes.data ?? []).map((row) => row.prompt_id)),
  };
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
    // Le moteur ne se lit que dans la fiche, et une carte masquee n'en ouvre
    // aucune. Ses sept champs citent la commande dans leurs phrases : les
    // laisser voyager reviendrait a publier le nom qu'on vient de retirer.
    moteur: null,
    // Une carte masquee n'ouvre pas de fiche, donc aucun formulaire. Les
    // libelles des champs decrivent la commande : ils n'ont pas a voyager.
    champs: [],
    // Meme raison pour les tags : ils nomment ce que fait la commande, et
    // une carte masquee ne dit rien de ce qu'elle fait.
    motsCles: [],
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
 * Identifiants des commandes portant tous les tags demandes.
 *
 * `null` quand aucun tag n'est coche. Un tableau vide quand aucune commande
 * ne les porte tous : l'appelant rend alors une liste vide au lieu du
 * catalogue entier — une erreur silencieuse qui ferait passer un filtre
 * trop etroit pour un filtre sans effet.
 *
 * LA LISTE PART DANS L'ADRESSE de la requete suivante, sous forme d'un
 * `in(id, ...)`. Chaque identifiant y pese trente-huit caracteres : au-dela
 * de quelques centaines, l'adresse depasse ce qu'une passerelle accepte et
 * la requete est refusee — pas lentement, pas partiellement : refusee.
 *
 * Deux choses la bornent aujourd'hui. Les tags des groupes « bibliotheque »
 * et « IA », seuls a porter quatre a six cents commandes, ne sont proposes
 * nulle part comme tags — ce sont deux facettes distinctes du filtre. Et
 * croiser un second tag ne peut que reduire. Le plus gros tag proposable en
 * compte cent vingt-sept, soit moins de cinq kilo-octets.
 *
 * Un test d'integration surveille cette borne : si elle cede, c'est le
 * filtre entier qu'il faudra passer en SQL, et non cette fonction qu'il
 * faudra tronquer — tronquer rendrait une liste fausse sans le dire.
 */
async function resoudreLesTags(client: Client, tags?: string[]): Promise<string[] | null> {
  if (!tags || tags.length === 0) return null;

  // UN SEUL TAG NE PASSE PLUS PAR ICI. La sonnette a sonne : le catalogue
  // Visuels V3 porte « photographie » sur plus de cinq cents commandes, et
  // cinq cents identifiants de trente-huit caracteres font une adresse
  // qu'une passerelle refuse. Le filtre a un tag est donc pose en SQL, par
  // une jointure interne, et ne rapatrie plus rien.
  //
  // L'intersection de plusieurs tags reste ici : une jointure ne sait rendre
  // qu'un OU, et croiser deux tags ne peut que reduire — le plus gros
  // croisement du catalogue tient largement dans une adresse.
  if (tags.length === 1) return null;

  const { data, error } = await client.rpc('prompts_avec_tous_les_tags', { p_tags: tags });

  // Une base qui refuse la question n'est pas une selection vide : on remonte
  // l'incident plutot que d'afficher « aucun resultat » pour une panne.
  if (error) throw new CatalogUnavailableError(error);

  return data ?? [];
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
  const marques = await getMarquesDuMembre();
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

  // Les tags se croisent en ET, et le croisement se fait dans la base.
  //
  // Une jointure filtree donne un OU : la liste s'allongerait a chaque tag
  // coche, c'est-a-dire l'inverse d'un filtre. L'intersection passe donc par
  // `prompts_avec_tous_les_tags`, qui travaille sur l'index inverse plutot
  // que de rapatrier toutes les associations pour les recouper ici.
  const tagIds = await resoudreLesTags(supabase, query.tags);
  if (tagIds && tagIds.length === 0) {
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
  // Le tag filtre en SQL, quand il est seul. La jointure rejoint les colonnes
  // de lecture comme celle du comptage : sans elle des deux cotes, le total
  // annonce ne correspondrait plus a la liste montree.
  const tagUnique = query.tags?.length === 1 ? query.tags[0] : null;

  const construire = (colonnes: string, tete = false) => {
    let requete = supabase
      .from('prompts')
      .select(
        (tagUnique && !tete ? `${colonnes},\n  ${JOINTURE_TAG}` : colonnes) as '*',
        tete ? { count: 'exact', head: true } : undefined,
      )
      .eq('status', 'published');

    if (!transverse) requete = requete.eq('mode', query.mode);

    if (query.library) requete = requete.eq('library', query.library);

    if (categorieIds) requete = requete.in('category_id', categorieIds);

    if (tagIds) requete = requete.in('id', tagIds);
    if (tagUnique) requete = requete.eq('filtre_tag.tags.slug', tagUnique);

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
  for (const cle of clesDeTri(query.sort, hasFullAccess)) {
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
    construire(colonnesDuComptage(Boolean(query.provider), Boolean(tagUnique)), true),
  ]);

  if (lecture.error) throw new CatalogUnavailableError(lecture.error);

  const rows = (lecture.data ?? []) as unknown as CardRow[];

  const items = rows.slice(0, pageSize).map((row) => {
    const card = toCard(row, marques);
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
 * Le comptage se fait sur les identifiants seuls — une colonne par ligne —
 * plutot qu'en interrogeant la base une fois par categorie. Par paliers, pour
 * la meme raison que la Bibliotheque : au-dela de mille commandes, une
 * lecture d'un bloc revient tronquee sans le dire, et une categorie bien
 * garnie se retrouve annoncee vide — ou pas annoncee du tout, puisqu'une
 * categorie a zero n'a rien a vendre.
 */
export async function getCategoriesVitrine(): Promise<CategorieVitrine[]> {
  const supabase = await createClient();

  const [{ data: categories, error }, prompts] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, short_description, mode, parent_id, sort_order')
      .eq('is_visible', true)
      .is('parent_id', null)
      .order('sort_order'),
    lireTousLesPaliers((debut, fin) =>
      supabase
        .from('prompts')
        .select('category_id')
        .eq('status', 'published')
        .order('id', { ascending: true })
        .range(debut, fin),
    ),
  ]);

  if (error) throw new CatalogUnavailableError(error);

  const parCategorie = new Map<string, number>();
  for (const prompt of prompts) {
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
  const marques = await getMarquesDuMembre();

  const { data, error } = await supabase
    .from('prompts')
    // `categories` UNE SEULE FOIS. `CARD_COLUMNS` porte deja
    // `categories(slug, name)` ; demander en plus `categories(name)`
    // embarque deux fois la meme relation dans un seul select, et PostgREST
    // rejette la requete. Cette fonction etait la seule a le faire, et
    // c'etaient exactement les deux seuls ecrans casses : Decouvrir, dont
    // le bouton rendait « La fiche n'a pas pu etre ouverte », et les pages
    // de partage `/r/`, qui rendaient une page neutre.
    //
    // Rien ne l'attrapait : la suite de tests parle a Postgres en direct,
    // jamais a PostgREST, donc une faute de syntaxe de select lui est
    // invisible.
    .select(`${CARD_COLUMNS}, expected_output`)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  // Une base injoignable n'est pas un raccourci inexistant : on remonte
  // l'incident plutot que d'afficher une page "introuvable" trompeuse.
  if (error) throw new CatalogUnavailableError(error);
  if (!data) return null;

  const row = data as unknown as CardRow & { expected_output: string | null };

  return {
    ...toCard(row, marques),
    expectedOutput: row.expected_output,
    // Le nom vient de l'embarquement unique de `CARD_COLUMNS`.
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

  // Les likes viennent de la meme lecture que partout ailleurs ; les
  // favoris, eux, sont deja connus — ce sont precisement ces lignes.
  const [{ data }, marques] = await Promise.all([
    supabase.from('prompts').select(CARD_COLUMNS).in('id', ids),
    getMarquesDuMembre(),
  ]);
  const cards = ((data ?? []) as unknown as CardRow[]).map((row) => toCard(row, marques));
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
  const marques = await getMarquesDuMembre();

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

  return ((data ?? []) as unknown as CardRow[]).map((row) => toCard(row, marques));
}

/**
 * Le vivier de la galerie de l'Accueil.
 *
 * Deux lectures, et c'est voulu.
 *
 * La premiere prend les transformations d'image et exige un visuel : une
 * carte image sans image ne montre rien de ce qu'elle produit.
 *
 * La seconde prend les Modes IA et les Parcours guides, **sans** exiger de
 * visuel. Un mode conditionne une conversation : il n'a pas de resultat a
 * montrer et n'en aura jamais. L'exiger revenait a ne jamais en proposer —
 * et c'est exactement ce qui se passait : la galerie n'a longtemps contenu
 * que des images, si bien que la regle qui devait y glisser un mode toutes
 * les quatre cartes n'avait jamais rien a glisser.
 *
 * Une seule requete avec un `or` aurait melange les deux exigences : soit
 * elle imposait le visuel aux modes, soit elle l'abandonnait pour les images.
 *
 * L'ordre commun place devant ce qui est utilisable. Une commande sans texte
 * a copier se regarde mais ne se lance pas. Devant, et non seule : le
 * catalogue arrive par vagues, et les exclure viderait l'Accueil — ce qui est
 * pire qu'une carte qui dit franchement « Bientot ».
 */
export async function getVivierDuFeed(
  limite = 60,
  { garder, offertsDabord = false }: { garder?: number; offertsDabord?: boolean } = {},
): Promise<PromptCard[]> {
  const supabase = await createClient();
  const marques = await getMarquesDuMembre();

  const [imagesReponse, experiencesReponse] = await Promise.all([
    supabase
      .from('prompts')
      .select(CARD_COLUMNS)
      .eq('status', 'published')
      .eq('media_ready', true)
      .neq('entity_type', 'mode_ia')
      .neq('entity_type', 'parcours')
      .order('payload_ready', { ascending: false })
      .order('is_featured', { ascending: false })
      .order('priority_score', { ascending: false, nullsFirst: false })
      .order('sort_order', { ascending: true })
      // Derniere cle unique : sans elle, deux ex aequo s'echangent d'un
      // chargement a l'autre et la galerie semble bouger seule.
      .order('command', { ascending: true })
      .limit(limite),
    supabase
      .from('prompts')
      .select(CARD_COLUMNS)
      .eq('status', 'published')
      .in('entity_type', ['mode_ia', 'parcours'])
      .order('payload_ready', { ascending: false })
      .order('is_featured', { ascending: false })
      .order('priority_score', { ascending: false, nullsFirst: false })
      .order('sort_order', { ascending: true })
      .order('command', { ascending: true })
      .limit(limite),
  ]);

  if (imagesReponse.error) throw new CatalogUnavailableError(imagesReponse.error);
  if (experiencesReponse.error) throw new CatalogUnavailableError(experiencesReponse.error);

  const lignes = [
    ...((imagesReponse.data ?? []) as unknown as CardRow[]),
    ...((experiencesReponse.data ?? []) as unknown as CardRow[]),
  ];

  const cartes = lignes.map((row) => toCard(row, marques));

  // LE TIRAGE VIT ICI, PAS DANS LA PAGE.
  //
  // L'accueil rendait le meme ordre a chaque visite : les memes douze
  // cartes en haut, tous les jours. Un catalogue de mille cartes donnait
  // l'impression d'en avoir douze, et rien n'incitait a revenir.
  //
  // Le melange appartient a la lecture, pas au rendu : un composant qui
  // appelle `Date.now()` pendant qu'il rend n'est plus idempotent, et le
  // compilateur React le refuse — a juste titre. Ici, dans une fonction
  // asynchrone de donnees, la variation est ce qu'on demande.
  //
  // `garder` borne ce qui ressort : on tire large pour varier, on rend
  // court pour ne pas charger trois cents vignettes.
  if (garder === undefined) return cartes;

  const melangees = melangerLeVivier(cartes, Date.now()).slice(0, garder);

  // LES OFFERTES EN TETE, POUR QUI N'A PAS L'ACCES — et pour lui seul.
  //
  // Sans acces, une commande reservee ne repond a rien qu'on puisse
  // essayer tout de suite : la galerie devient une vitrine fermee. Avec
  // l'acces, les remonter ferait voir en premier les quinze memes cartes a
  // chaque visite, ce qui defait exactement le melange qu'on vient de
  // faire.
  //
  // La partition garde l'ordre a l'interieur de chaque bloc : les offertes
  // restent melangees entre elles, le reste aussi.
  if (!offertsDabord) return melangees;
  return [
    ...melangees.filter((carte) => carte.isFree),
    ...melangees.filter((carte) => !carte.isFree),
  ];
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

  const marques = await getMarquesDuMembre();
  const { data } = await supabase
    .from('prompts')
    .select(CARD_COLUMNS)
    .in(
      'id',
      ordered.map((entry) => entry.id),
    );

  const cards = ((data ?? []) as unknown as CardRow[]).map((row) => toCard(row, marques));
  return ordered
    .map((entry) => cards.find((card) => card.id === entry.id))
    .filter((card) => card !== undefined);
}

/**
 * Les dernieres commandes reellement copiees.
 *
 * « Reprendre » montrait la derniere commande *ouverte*. Or ouvrir une fiche
 * ne veut rien dire : on en ouvre dix pour en retenir une. Copier, si — c'est
 * le geste qui dit qu'on s'en est servi, et c'est celui-la qu'on veut
 * reprendre.
 *
 * `recent_items` porte les deux dates ; seules les lignes qui ont une date de
 * copie entrent ici. Une commande archivee depuis reste dans le journal mais
 * ne revient pas : la lecture des cartes ne ramene que ce qui est publie.
 *
 * Dix et non trois. Trois tenaient dans une rangee sans defilement, mais on
 * ne revient pas chercher ce qu'on a copie il y a deux minutes — on revient
 * chercher ce qu'on a copie la semaine derniere et dont on a oublie le nom.
 * Trois ne remontaient jamais assez loin ; la rangee defile de toute facon.
 */
export async function getDernieresCopies(limite = 10): Promise<PromptCard[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from('recent_items')
    .select('prompt_id, last_copied_at')
    .not('last_copied_at', 'is', null)
    .order('last_copied_at', { ascending: false })
    .limit(limite);

  if (error) throw new CatalogUnavailableError(error);
  if ((rows ?? []).length === 0) return [];

  const ordre = (rows ?? []).map((row) => row.prompt_id);
  const marques = await getMarquesDuMembre();
  const { data } = await supabase
    .from('prompts')
    .select(CARD_COLUMNS)
    .eq('status', 'published')
    .in('id', ordre);

  const cartes = ((data ?? []) as unknown as CardRow[]).map((row) => toCard(row, marques));
  // L'ordre vient du journal, pas de la base : `in` ne le conserve pas.
  return ordre
    .map((id) => cartes.find((carte) => carte.id === id))
    .filter((carte) => carte !== undefined);
}
