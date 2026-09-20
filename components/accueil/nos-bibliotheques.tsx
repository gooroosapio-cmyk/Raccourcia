import Link from 'next/link';
import { LIBRARIES, LIBRARY_LABELS, LIBRARY_PROMESSES, type Library } from '@/lib/constants';

/**
 * Les trois bibliotheques, en tete d'accueil.
 *
 * C'est la premiere decision a prendre : est-ce que je veux une image, un
 * texte, ou une conversation ? Tout le reste — rayon, tag, IA — vient
 * apres, et n'a de sens qu'une fois celle-la prise.
 *
 * Trois tuiles cote a cote plutot qu'une rangee qui defile : avec trois
 * elements, faire glisser pour voir le troisieme reviendrait a le cacher.
 *
 * Chacune mene au SOMMAIRE de sa bibliotheque, et non plus a la liste
 * filtree. Toucher « Images » rendait mille cartes a la suite : une bonne
 * reponse quand on sait ce qu'on cherche, un mur quand on vient se
 * reperer — or c'est pour se reperer qu'on touche le nom d'une
 * bibliotheque. Le sommaire montre ses collections et ses tags ; « Voir
 * toutes les commandes » y ramene, pour qui voulait bien le mur.
 */
const TONS: Record<Library, { fond: string; encre: string }> = {
  images: { fond: 'bg-[color:var(--color-sky)]', encre: 'text-[color:var(--color-brand)]' },
  textes: { fond: 'bg-[#efeaff]', encre: 'text-[#6a4bd6]' },
  reflexions: { fond: 'bg-[#e6f6ec]', encre: 'text-[#1f8a4c]' },
};

export function NosBibliotheques({ disponibles }: { disponibles?: readonly Library[] }) {
  // Une bibliotheque vide ne se propose pas : la tuile ouvrirait sur rien.
  // Sans liste fournie, les trois s'affichent — c'est l'etat d'un catalogue
  // complet, et c'est celui qu'on rend au serveur quand le compte n'a pas
  // encore ete fait.
  const montrees = LIBRARIES.filter((library) => !disponibles || disponibles.includes(library));

  if (montrees.length === 0) return null;

  return (
    <ul className="grid grid-cols-3 gap-2 min-[400px]:gap-[var(--gouttiere-carte)]">
      {montrees.map((library) => {
        const ton = TONS[library];
        return (
          <li key={library}>
            <Link
              href={`/app/bibliotheque/rayon/${library}`}
              className={`flex h-full flex-col gap-1.5 rounded-[color:var(--radius-card)] ${ton.fond} p-3 transition-transform duration-[var(--duration-fast)] active:scale-[0.985]`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/80 ${ton.encre}`}
              >
                <IconeDeBibliotheque library={library} />
              </span>
              <span className="text-[length:var(--texte-titre-carte)] font-bold leading-tight text-[color:var(--color-night)]">
                {LIBRARY_LABELS[library]}
              </span>
              <span className="text-[length:var(--texte-meta)] leading-[1.35] text-[color:var(--color-muted)]">
                {LIBRARY_PROMESSES[library]}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function IconeDeBibliotheque({ library }: { library: Library }) {
  if (library === 'images') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3"
          y="4.5"
          width="18"
          height="15"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="8.5" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="m4 17 4.8-4.4a1.6 1.6 0 0 1 2.2 0L16 17m0 0 1.6-1.5a1.6 1.6 0 0 1 2.2 0L21 16.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (library === 'textes') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 3h7.5L19 8.5V21H6z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M13 3v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 13h7M9 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3a6 6 0 0 1 3.6 10.8c-.7.5-1.1 1.3-1.1 2.2H9.5c0-.9-.4-1.7-1.1-2.2A6 6 0 0 1 12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 19h4M10.5 21h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
