import type { ExecutionLevel, InputExampleKind, OutputFormatKind } from '@/lib/constants';
import type { Moteur } from '@/lib/catalog/moteur';
import type { GenreDeChamp } from '@/lib/prompt/personnalisation';

/**
 * Un champ a remplir avant de copier, tel que la fiche l'affiche.
 *
 * Plus riche que ce dont la substitution a besoin : le formulaire a besoin
 * d'un libelle, d'une indication et du libelle de chaque choix ; le serveur,
 * lui, ne relit que la clef, le genre et les valeurs acceptees.
 */
export type ChampDeCommande = {
  /** La clef employee dans le texte de la commande : {{chiffre_affaires}}. */
  cle: string;
  libelle: string;
  /** Ce qu'on attend, en quelques mots. `null` quand le libelle suffit. */
  indication: string | null;
  genre: GenreDeChamp;
  requis: boolean;
  /** Les choix d'un champ « liste ». Vide pour les autres genres. */
  choix: { valeur: string; libelle: string }[];
};
import type { Enums } from '@/lib/supabase/database.types';

/**
 * Comparaison Avant/Apres d'un raccourci image.
 *
 * Les deux visuels sont toujours transmis ensemble ou pas du tout : une
 * comparaison a moitie renseignee ne se comprend pas, et dupliquer l'image
 * d'entree en guise de resultat mentirait sur ce que le raccourci produit.
 */
export type BeforeAfter = {
  beforeUrl: string;
  beforeAlt: string;
  afterUrl: string;
  afterAlt: string;
};

/** Ce qu'une carte affiche. Jamais le prompt complet. */
export type PromptCard = {
  id: string;
  command: string;
  name: string;
  slug: string;
  mode: Enums<'app_mode'>;
  shortDescription: string;
  /** Ce que l'utilisateur obtient, en une phrase. */
  resultSummary: string;
  useCases: string[];
  tags: string[];
  showImageCard: boolean;
  /**
   * Le genre d'experience : une transformation d'image, un mode
   * conversationnel, un parcours guide. `null` pour une commande d'un import
   * anterieur au catalogue V2 — l'ecran retombe alors sur son comportement
   * precedent plutot que de deviner.
   */
  entityType: 'commande_image' | 'mode_ia' | 'parcours' | null;
  /**
   * Ce que la commande attend qu'on lui donne, tel que le catalogue le
   * formule : « Une photo nette de la personne », « Une photo du produit ou
   * de l'objet ». C'est la seule donnee qui distingue une transformation de
   * personne d'une mise en scene d'objet — le rayon ne suffit pas, « Art &
   * effets » contient les deux.
   */
  witnessType: string | null;
  /**
   * Images, Textes ou Reflexions : le premier niveau de rangement.
   *
   * La fiche s'en sert pour son fil — « Images > Matieres et
   * metamorphoses ». `null` pour une commande d'un import anterieur au
   * socle V3 : le fil n'affiche alors que la collection plutot que de
   * deviner une bibliotheque.
   */
  library: Enums<'app_library'> | null;
  /**
   * Le rayon d'ou vient la carte, pour le sur-titre du feed et pour la
   * regle qui interdit deux cartes du meme rayon a la suite.
   */
  collectionSlug: string | null;
  collectionName: string | null;
  /** Combien de photos la commande attend. `null` quand elle n'en attend pas. */
  imagesMin: number | null;
  /** Le format annonce du resultat : « 4:5 », « Multi-format ». */
  defaultRatio: string | null;
  /**
   * Vrai quand la commande a un texte a copier.
   *
   * Le catalogue V2 arrive sans payload : une carte existe avant son texte.
   * Le client ne peut pas le deviner — `prompt_versions` lui est ferme et
   * doit le rester — donc la base le lui dit.
   */
  payloadReady: boolean;
  /**
   * Le mot du bouton d'action, tel que le catalogue le donne : « Creer ce
   * visuel », « Activer le mode », « Lancer le parcours ». Un parcours et
   * une commande image ne se lancent pas avec le meme verbe.
   */
  ctaLabel: string | null;
  isFree: boolean;
  isNew: boolean;
  isFeatured: boolean;
  riskLevel: Enums<'risk_level'>;
  /**
   * Ce que la commande fera avant de produire, de A a E. `null` pour une
   * commande que le catalogue n'a pas encore graduee : la fiche n'annonce
   * alors rien plutot que d'inventer un niveau.
   */
  level: ExecutionLevel | null;
  /** Plafond de questions successives. `null` vaut aucune question. */
  maxQuestions: number | null;
  /**
   * Ce que la commande sait faire en plus de son cas principal : les titres
   * des raccourcis qu'elle a absorbes. Vide pour la plupart des commandes.
   */
  modes: string[];
  /** Comparaison complete, ou `null` tant que les deux visuels manquent. */
  beforeAfter: BeforeAfter | null;
  thumbnailUrl: string | null;
  thumbnailAlt: string | null;
  inputExamples: InputExampleKind[];
  outputFormats: OutputFormatKind[];
  providers: { key: string; name: string; compatibility: Enums<'compatibility_level'> }[];
  isFavorite: boolean;
  // Contenu de la fiche : entierement public, donc embarque avec la carte.
  // Ouvrir le detail ne declenche ainsi aucun aller-retour reseau.
  intention: string | null;
  expectedInput: string | null;
  limitations: string | null;
  requiredVariables: string[];
  /**
   * Ce que la commande fait, rend et refuse, tel que le catalogue l'ecrit.
   *
   * Present pour les Modes IA et les Parcours, `null` pour une commande
   * image. Une fiche image se comprend par son avant/apres et ces sept
   * champs n'y sont jamais lus : les embarquer pour les cinq cent
   * quatre-vingt-deux commandes image ajouterait vingt-cinq kilo-octets a
   * chaque palier de galerie sans rien afficher de plus.
   */
  moteur: Moteur | null;
  /**
   * Les champs a remplir avant de copier. Trois au plus, vide pour la
   * plupart des commandes.
   *
   * Embarques avec la carte, comme le reste de la fiche : ouvrir un detail
   * ne doit declencher aucun aller-retour, et l'immense majorite des
   * commandes n'en declare aucun — le tableau est alors vide et ne pese
   * rien.
   *
   * Ce que le formulaire renvoie n'est jamais ce qui decide : le serveur
   * relit les champs declares avant d'appliquer quoi que ce soit.
   */
  champs: ChampDeCommande[];
  /**
   * Les tags de la commande, tels que la fiche les montre.
   *
   * Ceux du referentiel, pas ceux de l'ancienne colonne `tags` — celle-ci
   * comptait 443 valeurs libres dont « mode-ia » et « modes-ia » pour une
   * meme idee, et rien ne pouvait les reconcilier.
   *
   * Six au plus, et sans les groupes « bibliotheque » ni « IA » : la fiche
   * dit deja l'un et l'autre ailleurs, et une commande en porte neuf en
   * moyenne — les transporter tous ferait grossir chaque page de galerie
   * pour un bloc qui ne se lit qu'une fois la fiche ouverte.
   */
  motsCles: { slug: string; nom: string }[];
};

/**
 * Ce qu'on sait d'une commande retiree, et rien de plus.
 *
 * Volontairement pauvre : de quoi ecrire un avis de retrait honnete, pas
 * de quoi reconstituer une fiche. Une page d'archive qui montrerait la
 * description complete offrirait gratuitement ce que l'acces paie.
 */
export type CommandeRetiree = {
  nom: string;
  commande: string;
  bibliotheque: string | null;
  retireeLe: string | null;
  /** Une carte encore publiee sous LA MEME commande, s'il en reste une. */
  remplacante: { slug: string; nom: string } | null;
};

/** Ce que la page publique ajoute. Toujours sans le prompt complet. */
export type PromptDetail = PromptCard & {
  expectedOutput: string | null;
  categoryName: string | null;
  media: { kind: Enums<'media_kind'>; url: string; alt: string | null }[];
};

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  /** A quoi sert la famille, telle que le catalogue la decrit. */
  description: string;
  mode: Enums<'app_mode'>;
  children: { id: string; slug: string; name: string }[];
};

/**
 * Une collection telle que la Bibliotheque la montre : une tuile.
 *
 * Elle porte de quoi se dessiner sans second aller-retour — son visuel, son
 * nom, ce qu'elle contient — parce qu'une grille de cinquante tuiles qui
 * irait chercher chacune son image ferait cinquante requetes.
 */
export type CollectionTile = {
  id: string;
  slug: string;
  name: string;
  /**
   * Ce qu'on trouve dans le rayon, en une phrase.
   *
   * Elle remplace le compteur sous la tuile. « 16 commandes » ne fait pas
   * choisir : le chiffre ne dit pas si ce qu'on cherche est derriere. Vide
   * pour un rayon que le catalogue n'a pas encore decrit — la tuile montre
   * alors son nom seul plutot qu'une phrase inventee.
   */
  description: string;
  /** Combien de commandes publiees s'y trouvent. */
  count: number;
  /**
   * Un a trois apercus reellement tires de la collection, dans l'ordre du
   * catalogue. Vide quand aucune de ses commandes n'a encore de visuel.
   *
   * Plusieurs et non un seul : une couverture faite d'une image unique ne dit
   * rien de ce qu'il y a derriere, et deux rayons voisins finissaient par
   * montrer la meme. Le catalogue V2 arrive sans images, donc beaucoup de
   * tuiles restent vides : l'ecran montre alors une tuile typographique — un
   * parti pris, pas une panne.
   */
  apercus: string[];
};

/** Une famille de la Bibliotheque et ses collections. */
export type LibraryFamily = {
  id: string;
  slug: string;
  name: string;
  description: string;
  mode: Enums<'app_mode'>;
  /** Total des commandes publiees de la famille, collections comprises. */
  count: number;
  /** Les apercus de sa propre couverture, distincts de ceux des autres familles. */
  apercus: string[];
  collections: CollectionTile[];
};

/**
 * Une carte du feed Decouvrir. Jamais le prompt, comme partout ailleurs.
 *
 * Elle porte beaucoup moins qu'une `PromptCard` : un visuel, un nom, trois
 * tags. Le feed se parcourt longtemps et sans fin — embarquer les trente
 * champs d'une fiche dans chacune de ses cartes reviendrait a telecharger le
 * catalogue entier pour en regarder huit. La fiche complete est demandee au
 * moment ou on l'ouvre, et seulement alors.
 */
export type CarteDecouverte = {
  id: string;
  slug: string;
  command: string;
  name: string;
  /** Bornee au mot pres : la carte en reserve deux lignes, pas davantage. */
  description: string;
  /**
   * Le visuel « apres », en grand.
   *
   * Jamais vide : une commande sans visuel n'entre pas dans le feed, et
   * c'est la jointure interne de la requete qui le garantit.
   */
  visuelUrl: string;
  visuelAlt: string;
  /** Trois au plus : au-dela, la zone basse mange le visuel. */
  tags: { slug: string; name: string }[];
  /** Vrai quand le membre courant l'a en favori. Faux pour un visiteur. */
  isFavorite: boolean;
  isFree: boolean;
  /**
   * La collection d'ou vient la carte, et ses voisines.
   *
   * Le feed se parcourt de haut en bas, au hasard : c'est sa promesse, et
   * c'est aussi sa limite — tomber sur un portrait vintage qui plait sans
   * pouvoir en voir d'autres du meme genre oblige a fermer, a chercher le
   * rayon, et a recommencer. Le geste lateral repond a cela : a droite,
   * les cartes de la meme collection.
   *
   * Vide quand la collection n'a qu'une carte publiee : un rail d'un seul
   * element promettrait un geste qui ne mene nulle part.
   */
  collection: { slug: string; nom: string } | null;
  voisines: CarteVoisine[];
};

/**
 * Une carte du rail lateral : le strict necessaire pour la montrer.
 *
 * Ni tags, ni compteur de likes, ni detail : ce sont des vignettes qu'on
 * parcourt du pouce, et embarquer la fiche complete de quatre voisines par
 * carte quadruplerait le poids de chaque palier.
 */
export type CarteVoisine = {
  id: string;
  /** Ce par quoi la fiche s'ouvre : l'identifiant public, pas l'interne. */
  slug: string;
  name: string;
  command: string;
  visuelUrl: string;
  visuelAlt: string;
  isFree: boolean;
};

/**
 * Le curseur du feed : un seul marque-page.
 *
 * Il y en avait deux, un par vivier, tant que Decouvrir melangeait des
 * images et des cartes ecrites : deux catalogues de tailles differentes
 * s'epuisent a des vitesses differentes, et un curseur unique aurait defait
 * le melange au bout de quelques paliers. Le feed ne montre plus que des
 * visuels ; il n'y a plus qu'un catalogue a parcourir.
 *
 * Le rang **et** l'identifiant : deux commandes peuvent partager un rang, et
 * sans le second critere la frontiere entre deux paliers sauterait une carte
 * ou la repeterait.
 */
export type CurseurDecouverte = { rang: number; id: string };

export type PageDecouverte = {
  cartes: CarteDecouverte[];
  /** `null` quand il n'y a plus rien apres. */
  suite: CurseurDecouverte | null;
};
