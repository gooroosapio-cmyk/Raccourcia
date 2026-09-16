import Link from 'next/link';
import { IconeRayon } from '@/components/discovery/icone-rayon';
import { famillesDeRayon } from '@/lib/catalog/familles-speciales';
import type { LibraryFamily } from '@/lib/catalog/types';

/**
 * « Explorer » : les six rayons, sur une seule ligne.
 *
 * Ils defilaient : la sixieme pastille sortait de l'ecran, et un aiguillage
 * qu'il faut faire glisser pour voir en entier n'aiguille personne — on
 * choisit parmi ce qu'on voit. Les pastilles se resserrent donc jusqu'a ce
 * que les six tiennent sur un ecran de 360 px, gouttieres comprises.
 *
 * Elles sont pleines, en bleu nuit, texte et dessin en clair. En aplat pale
 * elles se confondaient avec le fond de la page ; le rayon est une
 * destination, il doit se lire comme un bouton.
 *
 * Aucun nombre : un compte classe les rayons par taille et pousse vers le
 * plus gros, il n'aide personne a choisir un sujet.
 *
 * Les rayons viennent de la base, dans l'ordre du catalogue. Aucun n'est
 * nomme ici : en ajouter un en administration le fait apparaitre sans
 * redeploiement, avec l'icone qui suit sa position.
 */
export function RailExplorer({ familles }: { familles: LibraryFamily[] }) {
  const rayons = famillesDeRayon(familles).slice(0, 6);

  if (rayons.length === 0) return null;

  return (
    <nav aria-label="Explorer les rayons">
      {/* Six colonnes egales plutot qu'une rangee qui defile : la largeur
          disponible se partage, et rien ne depasse. */}
      <ul className="grid grid-cols-6 gap-1.5">
        {rayons.map((famille, index) => (
          <li key={famille.id}>
            <Link
              href={`/app/bibliotheque/famille/${famille.slug}`}
              className="flex flex-col items-center gap-1 transition-transform duration-[var(--duration-fast)] active:scale-95"
            >
              <span className="flex aspect-square w-full max-w-[46px] items-center justify-center rounded-full bg-[color:var(--color-night)] text-white">
                <IconeRayon index={index} taille={20} />
              </span>
              <span className="line-clamp-2 text-center text-[11px] font-medium leading-[1.2] text-[color:var(--color-night)]">
                {nomCourt(famille.name)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Un nom de rayon qui tient sous une pastille de 46 px.
 *
 * « Portraits & souvenirs » sur deux lignes se coupe au milieu d'un mot. On
 * garde le premier terme, celui qui identifie : « Portraits », « Photos
 * produit ». Le nom complet reste en bibliotheque, ou il a la place.
 */
function nomCourt(nom: string): string {
  const premier = nom.split(/\s*&\s*|\s+et\s+|\s*[,·]\s*/)[0]!.trim();
  return premier.length >= 4 ? premier : nom;
}
