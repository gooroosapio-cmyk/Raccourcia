import Link from 'next/link';
import Image from 'next/image';

/**
 * Une invitation posee dans la galerie, a la place d'une rangee.
 *
 * Rare — deux sur toute la galerie — et jamais decorative : elle propose
 * d'ouvrir un rayon precis, avec trois de ses resultats en guise de preuve.
 * Une invitation sans image demanderait de faire confiance a un titre.
 *
 * Elle interrompt la galerie sur toute sa largeur. C'est le seul endroit ou
 * l'Accueil s'autorise a le faire : au-dela, la galerie ne serait plus une
 * galerie mais une alternance de blocs.
 */
export function CarteEditoriale({
  surtitre,
  titre,
  promesse,
  action,
  href,
  apercus = [],
}: {
  surtitre: string;
  titre: string;
  promesse?: string;
  action: string;
  href: string;
  /** Jusqu'a trois apercus reellement tires du rayon propose. */
  apercus?: string[];
}) {
  const images = apercus.slice(0, 3);

  return (
    <Link
      href={href}
      className="flex items-stretch gap-3 overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3 transition-transform duration-[var(--duration-fast)] active:scale-[0.99]"
    >
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <span className="text-[length:var(--texte-meta)] font-semibold uppercase tracking-wide text-[color:var(--color-brand)]">
          {surtitre}
        </span>
        <span className="text-[17px] font-bold leading-tight text-[color:var(--color-night)]">
          {titre}
        </span>
        {promesse ? (
          <span className="line-clamp-2 text-[length:var(--texte-carte)] leading-snug text-[color:var(--color-muted)]">
            {promesse}
          </span>
        ) : null}
        <span className="mt-1 inline-flex items-center gap-1 text-[length:var(--texte-carte)] font-semibold text-[color:var(--color-brand)]">
          {action}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m9 5 7 7-7 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>

      {images.length > 0 ? (
        // Les apercus se chevauchent legerement : trois vignettes alignees
        // ressembleraient a une galerie miniature et entreraient en
        // concurrence avec la vraie, juste au-dessus.
        <span aria-hidden="true" className="flex shrink-0 items-center -space-x-4">
          {images.map((url, index) => (
            <span
              key={url}
              className="relative h-[72px] w-[58px] overflow-hidden rounded-[10px] border-2 border-[color:var(--color-surface)] shadow-[var(--shadow-card)]"
              style={{ zIndex: images.length - index }}
            >
              <Image src={url} alt="" fill unoptimized sizes="58px" className="object-cover" />
            </span>
          ))}
        </span>
      ) : null}
    </Link>
  );
}
