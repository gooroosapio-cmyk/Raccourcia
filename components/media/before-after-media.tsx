import Image from 'next/image';
import type { BeforeAfter } from '@/lib/catalog/types';

/**
 * Comparaison Avant/Apres.
 *
 * Les deux visuels sont visibles en meme temps, cote a cote. Un carrousel ou
 * un curseur imposerait un geste avant de comprendre ce que fait le
 * raccourci : la promesse doit se lire sans interaction.
 *
 * Le sens ne repose pas sur le seul trait de separation. Les libelles "Avant"
 * et "Apres" sont du texte, chaque image porte son propre alternatif, et
 * l'ensemble est une figure dont la legende decrit la transformation.
 */
export function BeforeAfterMedia({
  media,
  command,
  priority = false,
  sizes = '(max-width: 640px) 100vw, 640px',
  rounded = true,
}: {
  media: BeforeAfter;
  command: string;
  /** Vrai uniquement pour le premier visuel de la page. */
  priority?: boolean;
  sizes?: string;
  rounded?: boolean;
}) {
  return (
    <figure
      className={`relative aspect-[16/10] w-full overflow-hidden bg-[color:var(--color-canvas)] ${
        rounded ? 'rounded-[color:var(--radius-card)]' : ''
      }`}
    >
      <div className="absolute inset-0 grid grid-cols-2">
        <div className="relative overflow-hidden">
          <Image
            src={media.beforeUrl}
            alt={media.beforeAlt}
            fill
            sizes={sizes}
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            className="object-cover"
          />
        </div>
        <div className="relative overflow-hidden">
          <Image
            src={media.afterUrl}
            alt={media.afterAlt}
            fill
            sizes={sizes}
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            className="object-cover"
          />
        </div>
      </div>

      {/* Trait de separation, purement visuel : le sens est porte par les
          libelles ci-dessous. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/85"
      />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-[var(--shadow-card)]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12h14m0 0-5-5m5 5-5 5"
            stroke="var(--color-night)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <Etiquette position="gauche">Avant</Etiquette>
      <Etiquette position="droite">Apres</Etiquette>

      <figcaption className="sr-only">
        {command} : a gauche, {media.beforeAlt}. A droite, {media.afterAlt}.
      </figcaption>
    </figure>
  );
}

function Etiquette({
  children,
  position,
}: {
  children: React.ReactNode;
  position: 'gauche' | 'droite';
}) {
  return (
    <span
      className={`absolute top-2 rounded-full bg-white/92 px-2 py-[3px] text-[11px] font-semibold text-[color:var(--color-night)] ${
        position === 'gauche' ? 'left-2' : 'right-2'
      }`}
    >
      {children}
    </span>
  );
}

/**
 * Le resultat seul, pour la carte de la bibliotheque.
 *
 * Une carte se parcourt au pouce : deux vignettes cote a cote y font deux
 * images de 90 px que personne ne lit. La carte montre donc ce que la
 * commande produit ; la comparaison, qui demande a etre regardee, s'ouvre sur
 * la fiche.
 */
export function ResultMedia({
  url,
  alt,
  command,
  priority = false,
  sizes = '(max-width: 640px) 100vw, 600px',
  rounded = true,
}: {
  url: string;
  alt: string | null;
  command: string;
  priority?: boolean;
  sizes?: string;
  rounded?: boolean;
}) {
  return (
    <div
      className={`relative aspect-[16/10] w-full overflow-hidden bg-[color:var(--color-canvas)] ${
        rounded ? 'rounded-[color:var(--radius-card)]' : ''
      }`}
    >
      <Image
        src={url}
        alt={alt ?? `Resultat obtenu avec ${command}`}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        className="object-cover"
      />
    </div>
  );
}

/**
 * Repli quand la comparaison n'est pas encore renseignee.
 *
 * On ne duplique jamais l'image d'entree pour combler le manque : la carte
 * assume l'absence de visuel plutot que d'annoncer une transformation qui
 * n'est pas montree.
 */
export function MediaPlaceholder({ command }: { command: string }) {
  return (
    <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-[color:var(--radius-card)] bg-gradient-to-br from-[color:var(--color-sky)] to-[color:var(--color-canvas)] px-4">
      <span className="commande truncate text-[18px] font-semibold text-[color:var(--color-brand)]">
        {command}
      </span>
    </div>
  );
}
