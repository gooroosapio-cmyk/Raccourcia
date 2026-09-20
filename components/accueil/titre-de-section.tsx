import Link from 'next/link';

/**
 * Le titre d'une section de l'accueil : une icone, un titre, une sortie.
 *
 * L'icone n'est pas une decoration. L'accueil empile quatre sections de
 * formes proches — des tuiles, des rangees, une galerie — et sur un
 * telephone on les parcourt au pouce sans lire les titres. Un signe en tete
 * de ligne se reconnait plus vite qu'un mot, et c'est lui qui dit ou l'on
 * en est dans la page.
 *
 * « Tout voir » n'apparait que lorsqu'il reste vraiment quelque chose a
 * voir. Un lien qui mene a la meme liste, en plus long, fait perdre sa
 * place pour rien.
 */
export function TitreDeSection({
  titre,
  icone,
  href,
  action = 'Tout voir',
}: {
  titre: string;
  /** Le signe pose devant le titre. */
  icone: React.ReactNode;
  /** Ou mene « Tout voir ». Absent, la sortie ne s'affiche pas. */
  href?: string;
  action?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-center gap-2 text-[length:var(--texte-section)] font-bold leading-tight text-[color:var(--color-night)]">
        <span aria-hidden="true" className="shrink-0 text-[color:var(--color-brand)]">
          {icone}
        </span>
        <span className="truncate">{titre}</span>
      </h2>

      {href ? (
        <Link
          href={href}
          className="touch-target inline-flex shrink-0 items-center gap-1 px-1 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-brand)]"
        >
          {action}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12h13m0 0-5-5m5 5-5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      ) : null}
    </div>
  );
}

/* --- Les signes des sections -------------------------------------------
 *
 * Dessines ici plutot que tires du kit : ce sont quatre traits de
 * vingt pixels, et les faire venir du generateur d'illustrations ferait
 * entrer cinquante kilo-octets dans la page pour en afficher quatre.
 */

export function IconeBibliotheques() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="5" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="10" y="4" width="5" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m17.5 5.6 3.2 14.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconeCollections() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7 4h10a3 3 0 0 1 3 3v9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconeRecemment() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** La flamme des tendances, en trait : un aplat orange volerait l'attention. */
export function IconeTendances() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3c.6 3 2.2 4 3.6 5.6A7.5 7.5 0 0 1 12 21a7.5 7.5 0 0 1-3.6-12.4C9.5 7.2 10.8 6 12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 21a3.4 3.4 0 0 1-1.6-5.6c.7-.8 1.3-1.3 1.6-2.4.3 1.1.9 1.6 1.6 2.4A3.4 3.4 0 0 1 12 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
