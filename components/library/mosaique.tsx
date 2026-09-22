import Image from 'next/image';
import { resumerPourCarte } from '@/lib/format/resume';
import Link from 'next/link';
import { FondDeRayon } from '@/components/library/fond-de-rayon';
import { EtoileDeRayon } from '@/components/library/etoile-de-rayon';
import type { GenreDeRayon } from '@/lib/actions/tags-favoris';

/**
 * Une mosaique de cartes illustrees, de tailles inegales.
 *
 * La Bibliotheque presentait deux choses de deux facons : les tags en
 * tuiles, les rayons en accordeons a ouvrir, chacun coiffe d'un intitule de
 * groupe — « Rendu », « Capacite », « Contexte ». Ces intitules sont le
 * vocabulaire du classeur, pas celui du lecteur : personne n'arrive en se
 * demandant s'il cherche un rendu ou une capacite.
 *
 * Il ne reste donc qu'un objet : une carte avec une image et un nom. Les
 * tailles varient pour que la page ait un relief — une grille parfaitement
 * reguliere de vingt vignettes se parcourt sans que l'oeil s'accroche
 * nulle part. Le rythme est calcule, pas aleatoire : une large toutes les
 * cinq, toujours au meme endroit, donc la page ne saute pas au rechargement.
 *
 * L'image est empruntee a une carte du lot quand l'administration n'en a
 * pas depose : une grille de cadres vides ne donne envie d'ouvrir aucun
 * rayon. Et quand meme cela ne donne rien — un rayon dont aucune commande
 * n'a de visuel —, `FondDeRayon` pose une teinte et un dessin plutot que
 * du gris.
 */
export type CarteDeMosaique = {
  /** Ce qui l'identifie dans la liste, et dans l'adresse. */
  cle: string;
  href: string;
  titre: string;
  /** Ce qui se lit sous le titre : un compte, une famille. */
  detail?: string;
  imageUrl: string | null;
  /** Le slug du rayon, dont se deduit sa teinte de repli. */
  slug: string;
  /** Un tag ou une collection : l'etoile s'en sert pour savoir ou ecrire. */
  genre: GenreDeRayon;
  /**
   * La categorie dont releve la carte, quand elle en a une.
   *
   * Renseignee pour une collection, absente pour un tag : un tag qualifie
   * une commande, il ne la range pas. C'est ce qui permet a l'etagere de
   * resserrer sur une categorie sans confondre les deux axes.
   */
  famille?: string;
  /**
   * Presente pour un membre seulement : l'etoile qui epingle le rayon. Un
   * visiteur n'a pas de rayon a lui, et la lui montrer serait promettre
   * un geste qui echoue.
   */
  epingle?: boolean;
};

/**
 * Le rythme des tailles.
 *
 * Une carte large tous les cinq elements : assez pour donner un relief,
 * assez peu pour que la grille reste une grille. Le motif se repete, donc
 * il se prevoit — et une mise en page qu'on prevoit se parcourt vite.
 */
function estLarge(rang: number): boolean {
  return rang % 5 === 0;
}

export function Mosaique({
  cartes,
  /** Les premieres images sont chargees en priorite : elles sont a l'ecran. */
  prioritaires = 2,
}: {
  cartes: CarteDeMosaique[];
  prioritaires?: number;
}) {
  if (cartes.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-2 min-[400px]:gap-[var(--gouttiere-carte)]">
      {cartes.map((carte, rang) => {
        const large = estLarge(rang);
        return (
          // `relative` : l'etoile se pose par-dessus la carte, jamais
          // dedans — un bouton dans une ancre n'est pas du HTML valide.
          <li key={carte.cle} className={`relative ${large ? 'col-span-2' : ''}`}>
            <CarteIllustree carte={carte} large={large} priority={rang < prioritaires} />
            {carte.epingle === undefined ? null : (
              <EtoileDeRayon
                genre={carte.genre}
                slug={carte.slug}
                nom={carte.titre}
                epingleAuDepart={carte.epingle}
                surVisuel={carte.imageUrl !== null}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CarteIllustree({
  carte,
  large,
  priority,
}: {
  carte: CarteDeMosaique;
  large: boolean;
  priority: boolean;
}) {
  return (
    <Link
      href={carte.href}
      className={`relative flex w-full flex-col justify-end overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-sky)] p-3 transition-transform duration-[var(--duration-fast)] active:scale-[0.985] ${
        // Une carte large est plus basse qu'elle n'est haute : elle occupe
        // deux colonnes, lui garder le meme rapport en ferait une affiche
        // qui pousse tout le reste hors de l'ecran.
        large ? 'aspect-[2/1]' : 'aspect-[4/3]'
      }`}
    >
      {carte.imageUrl === null ? (
        <FondDeRayon slug={carte.slug} nom={carte.titre} />
      ) : (
        <>
          <Image
            src={carte.imageUrl}
            alt=""
            aria-hidden="true"
            fill
            sizes={large ? '(max-width: 430px) 100vw, 430px' : '(max-width: 430px) 50vw, 220px'}
            className="object-cover"
            priority={priority}
          />
          {/* Le nom se pose sur un fondu, jamais sur l'image nue : un texte
              blanc sur un visuel clair ne se lit pas. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
          />
        </>
      )}

      <span className="relative">
        <span
          className={`block text-[length:var(--texte-titre-carte)] font-bold leading-[1.25] ${
            carte.imageUrl ? 'text-white' : 'text-[color:var(--color-night)]'
          }`}
        >
          {carte.titre}
        </span>
        {/* UNE PHRASE PLUTOT QU'UN COMPTEUR, QUAND ELLE EXISTE.
            « 32 commandes » ne dit pas si ce qu'on cherche est derriere.
            La description, elle, le dit — et c'est la seule chose qu'une
            carte de rayon de Textes a a montrer, faute d'image a
            emprunter. Deux lignes au plus : au-dela, elle deborde du
            cadre et pousse le titre hors de la carte. */}
        {carte.detail ? (
          <span
            className={`mt-0.5 line-clamp-2 text-[length:var(--texte-meta)] leading-snug ${
              carte.imageUrl ? 'text-white/80' : 'text-[color:var(--color-muted)]'
            }`}
          >
            {resumerPourCarte(carte.detail)}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
