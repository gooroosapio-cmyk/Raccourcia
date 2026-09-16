import Link from 'next/link';
import { famillesDeRayon } from '@/lib/catalog/familles-speciales';
import type { LibraryFamily } from '@/lib/catalog/types';

/**
 * « Explorer » : six pastilles rondes, une par rayon.
 *
 * Des couvertures photographiques occupaient cette place. Elles entraient en
 * concurrence avec la galerie juste en dessous — deux rangees d'images qui
 * se disputaient l'oeil, et l'aiguillage perdait contre les idees. Une icone
 * ne cherche pas a plaire : elle situe, puis s'efface.
 *
 * Aucun nombre. Un compte classe les rayons par taille et pousse vers le
 * plus gros ; il n'aide personne a choisir un sujet.
 *
 * Les rayons viennent de la base, dans l'ordre du catalogue. Aucun n'est
 * nomme ici : en ajouter un en administration le fait apparaitre sans
 * redeploiement, avec l'icone qui suit sa position.
 */
export function RailExplorer({ familles }: { familles: LibraryFamily[] }) {
  const rayons = famillesDeRayon(familles).slice(0, 6);

  if (rayons.length === 0) return null;

  return (
    <section>
      {/* La rangee deborde des marges : la derniere pastille peut sortir de
          l'ecran, et ce debord dit qu'il y a une suite. */}
      <div className="rail -mx-5 px-5">
        <ul className="flex w-max gap-4 pb-1">
          {rayons.map((famille, index) => (
            <li key={famille.id}>
              <Link
                href={`/app/bibliotheque/famille/${famille.slug}`}
                className="flex w-[64px] flex-col items-center gap-1.5 transition-transform duration-[var(--duration-fast)] active:scale-95"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-sky)] text-[color:var(--color-brand)]">
                  <IconeDeRayon index={index} />
                </span>
                <span className="line-clamp-2 text-center text-[length:var(--texte-meta)] font-medium leading-tight text-[color:var(--color-night)]">
                  {nomCourt(famille.name)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * L'icone d'un rayon, tiree de sa position et non de son nom.
 *
 * Six dessins dans l'ordre du catalogue : portraits, styles, art, produit,
 * publicite, technique. Les associer au nom demanderait de coder en dur les
 * rayons dans l'ecran — et le jour ou l'administration en renomme un,
 * l'icone disparaitrait sans prevenir.
 */
function IconeDeRayon({ index }: { index: number }) {
  const traits = [
    // Portraits : un buste.
    'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5 20a7 7 0 0 1 14 0',
    // Styles : un cintre.
    'M12 7a2 2 0 1 1 2 2c-1.2 0-2 .8-2 2M4 19l8-6 8 6H4Z',
    // Art & effets : une etoile a quatre branches.
    'M12 3.5c.6 4.2 1.8 5.4 6 6-4.2.6-5.4 1.8-6 6-.6-4.2-1.8-5.4-6-6 4.2-.6 5.4-1.8 6-6Z',
    // Produit : une boite.
    'M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5ZM4 8l8 4.5L20 8M12 12.5V20',
    // Publicite : un porte-voix.
    'M4 10v4h3l6 4V6l-6 4H4ZM17.5 9a4 4 0 0 1 0 6',
    // Technique : un compas.
    'M12 4v3M9.5 20l2.5-9 2.5 9M12 7a2.5 2.5 0 0 1 2.5 2.5c0 1-.6 1.9-1.5 2.3M12 7a2.5 2.5 0 0 0-2.5 2.5c0 1 .6 1.9 1.5 2.3',
  ];

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={traits[index % traits.length]}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Un nom de rayon qui tient sous une pastille de 64 px.
 *
 * « Portraits & souvenirs » sur deux lignes se coupe au milieu d'un mot. On
 * garde le premier terme, celui qui identifie : « Portraits », « Photos
 * produit ». Le nom complet reste en bibliotheque, ou il a la place.
 */
function nomCourt(nom: string): string {
  const premier = nom.split(/\s*&\s*|\s+et\s+|\s*[,·]\s*/)[0]!.trim();
  return premier.length >= 4 ? premier : nom;
}
