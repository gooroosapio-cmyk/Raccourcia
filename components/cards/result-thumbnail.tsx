import Image from 'next/image';
import { VisualSlot } from '@/components/cards/visual-slot';

/**
 * Vignette d'une carte : le resultat, et rien d'autre.
 *
 * La comparaison Avant/Apres appartient a la fiche, ou elle a la place d'etre
 * regardee. Dans une grille a deux colonnes, chaque moitie ferait 85 px de
 * large : deux images de cette taille cote a cote ne montrent rien, et
 * l'image de depart y volerait la place de celle qui donne envie.
 *
 * Le cadre lui-meme vient de `VisualSlot`, partage avec le repli et avec la
 * zone d'intention des cartes texte : c'est ce qui garantit que la grille ne
 * saute pas sous le pouce quand un visuel arrive.
 */
export function ResultThumbnail({
  url,
  alt,
  libelle,
  mission = false,
  priority = false,
}: {
  url: string | null;
  alt: string | null;
  /**
   * Ce que la vignette montre, pour l'annonce vocale. La carte y met la
   * commande quand elle l'affiche, et sa description quand elle la masque :
   * un texte de remplacement qui nommerait la commande la rendrait lisible a
   * qui ne doit pas encore la lire.
   */
  libelle: string;
  /** Vrai pour une commande qui conduit un travail en plusieurs etapes. */
  mission?: boolean;
  /** Vrai pour les premieres vignettes seulement. */
  priority?: boolean;
}) {
  if (!url) return <ThumbnailPlaceholder libelle={libelle} mission={mission} />;

  return (
    <VisualSlot mission={mission}>
      <Image
        src={url}
        alt={alt ?? `Résultat obtenu avec ${libelle}`}
        fill
        // Deux colonnes sur mobile, trois sur tablette, quatre au-dela : on
        // ne telecharge jamais une image de pleine largeur pour une demi-carte.
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        className="object-cover"
      />
    </VisualSlot>
  );
}

/**
 * Repli quand le visuel de resultat manque.
 *
 * On n'y met jamais l'image Avant : elle annoncerait une transformation que
 * la carte ne montre pas. Le cadre dit simplement que le visuel viendra.
 */
export function ThumbnailPlaceholder({
  libelle,
  mission = false,
}: {
  libelle: string;
  mission?: boolean;
}) {
  return (
    <VisualSlot ton="texte" mission={mission}>
      <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2.5"
            stroke="var(--color-brand)"
            strokeWidth="1.6"
            opacity="0.55"
          />
          <circle cx="8.5" cy="10" r="1.6" fill="var(--color-brand)" opacity="0.55" />
          <path
            d="m4.5 17 4.6-4.3 3.4 3.1 3-2.6 4 3.8"
            stroke="var(--color-brand)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          />
        </svg>
        <span className="text-[var(--texte-meta)] font-medium text-[color:var(--color-brand)]/75">
          Visuel à venir
        </span>
        <span className="sr-only">{libelle}</span>
      </span>
    </VisualSlot>
  );
}
