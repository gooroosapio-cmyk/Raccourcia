import { z } from 'zod';
import {
  LIBRARIES,
  MODES,
  OUTPUT_FORMAT_KINDS,
  PROVIDER_KEYS,
  SURFACES,
  CATALOG_PAGE_SIZE,
} from '@/lib/constants';

/**
 * Schemas d'entree serveur. Aucune confiance n'est accordee au client :
 * prompt_id, provider, role et droit sont toujours revalides (Doc Technique, 16.1).
 */

export const resolvePromptInput = z.object({
  promptId: z.string().uuid(),
  /**
   * Ou le membre comptait coller, s'il l'a dit. Facultatif depuis le
   * payload unique : l'IA ne choisit plus le texte (CLAUDE.md).
   */
  provider: z.enum(PROVIDER_KEYS).optional(),
  surface: z.enum(SURFACES).default('detail'),
  /**
   * Ce que la fiche a fait saisir, avant la copie.
   *
   * Trois au plus, comme la base le borne. Les clefs sont acceptees ici mais
   * ne decident de rien : le serveur relit les champs reellement declares
   * pour la commande et ignore tout le reste. Une clef inventee ne peut donc
   * atteindre aucune partie du texte.
   *
   * La borne de longueur est large — le nettoyage fin appartient a
   * `lib/prompt/personnalisation`, qui connait le genre de chaque champ.
   * Elle n'est la que pour refuser une charge qui n'aurait rien d'un champ.
   */
  champs: z
    .array(
      z.object({
        cle: z.string().trim().min(1).max(60),
        valeur: z.string().max(1000),
      }),
    )
    .max(3)
    .optional(),
});

export type ResolvePromptInput = z.infer<typeof resolvePromptInput>;

/**
 * Ce que le navigateur annonce une fois le presse-papiers ecrit.
 *
 * Ni le texte ni les champs saisis : seulement quelle commande, quelle
 * version, d'ou. La base refait les controles d'acces avant d'inscrire.
 */
export const copieReussieInput = z.object({
  promptId: z.string().uuid(),
  versionId: z.string().uuid(),
  provider: z.enum(PROVIDER_KEYS).optional(),
  surface: z.enum(SURFACES).default('detail'),
});

export type CopieReussieInput = z.infer<typeof copieReussieInput>;

export const catalogQuery = z.object({
  mode: z.enum(MODES).default('image'),
  categorySlug: z.string().min(1).max(80).optional(),
  // La bibliotheque : Images, Textes, Reflexions. Elle ne remplace pas le
  // mode — elle range autrement, et l'administration peut la corriger
  // commande par commande.
  library: z.enum(LIBRARIES).optional(),
  // Les tags coches, croises en ET. Cinq au plus : au-dela, la liste est
  // toujours vide et la requete ne sert plus qu'a le prouver.
  tags: z.array(z.string().trim().min(1).max(60)).max(5).optional(),
  provider: z.enum(PROVIDER_KEYS).optional(),
  search: z.string().trim().max(80).optional(),
  sort: z.enum(['populaires', 'nouveaux', 'alpha']).default('populaires'),
  // Filtres avances. Chacun est une valeur d'une liste fermee : une valeur
  // inconnue arrivant par l'URL est ignoree, jamais transmise a la requete.
  access: z.enum(['gratuit', 'membre']).optional(),
  output: z.enum(OUTPUT_FORMAT_KINDS).optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  // La bibliotheque s'affiche par lots cumules : la page en demande
  // `CATALOG_PAGE_SIZE * lot` d'un coup. La borne couvre le plus grand mode
  // du catalogue. Cette valeur n'est jamais lue depuis l'URL : la page
  // construit l'objet elle-meme, un visiteur ne peut donc pas s'en servir
  // pour reclamer tout le catalogue en une requete.
  pageSize: z.coerce.number().int().min(1).max(240).default(CATALOG_PAGE_SIZE),
  // Jusqu'ou porte la recherche.
  //
  // « domaine » borne au mode courant : c'est ainsi qu'on parcourt la
  // bibliotheque, rayon par rayon. « catalogue » ignore le mode, parce que
  // chercher « logo » depuis les images et ne rien trouver, alors que la
  // commande existe dans les modes IA, est un cul-de-sac.
  //
  // Jamais lue depuis l'URL : la page la deduit de ce que l'utilisateur a
  // reellement choisi.
  portee: z.enum(['domaine', 'catalogue']).default('domaine'),
});

export type CatalogQuery = z.infer<typeof catalogQuery>;

export const toggleFavoriteInput = z.object({
  promptId: z.string().uuid(),
});

export const signInInput = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

/**
 * Activation ou recuperation : licence ET email de vente exiges ensemble,
 * puis definition du mot de passe (Doc Technique V1, 8.2).
 *
 * La confirmation est verifiee ici, cote serveur, et pas seulement dans le
 * formulaire : un mot de passe saisi de travers enfermerait dehors quelqu'un
 * qui vient de payer, et la seule sortie serait la recuperation — celle-la
 * meme qui redemande ce mot de passe.
 */
export const claimAccessInput = z
  .object({
    email: z.string().email().max(255),
    license: z.string().trim().min(6).max(120),
    password: z.string().min(8).max(200),
    passwordConfirm: z.string().min(8).max(200),
  })
  .refine((valeurs) => valeurs.password === valeurs.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Les deux mots de passe doivent être identiques.',
  });

export const revokeSessionInput = z.object({
  sessionId: z.string().uuid(),
});
