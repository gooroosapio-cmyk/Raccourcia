import Link from 'next/link';
import { CollectionTile } from '@/components/library/collection-tile';
import { famillesDeRayon } from '@/lib/catalog/familles-speciales';
import type { LibraryFamily } from '@/lib/catalog/types';

/**
 * La rangee « Explorer » de l'Accueil.
 *
 * Elle a remplace une grille de six pastilles chiffrees. La grille occupait
 * le haut de l'ecran, annoncait « 136 » comme un argument et repoussait le
 * feed sous la ligne de flottaison : on arrivait sur un ecran d'aiguillage
 * avant d'avoir vu une seule idee.
 *
 * Une rangee horizontale prend une hauteur au lieu de deux, laisse voir la
 * carte suivante — donc dit qu'elle se fait glisser — et ne compte rien. Le
 * nombre de commandes ne fait choisir personne : il classe les categories
 * par taille et pousse vers la plus grosse.
 *
 * Les familles viennent de la base, dans l'ordre du catalogue. Aucune n'est
 * nommee ici : en ajouter une en administration la fait apparaitre sans
 * redeploiement.
 */
export function RailExplorer({ familles }: { familles: LibraryFamily[] }) {
  const rayons = famillesDeRayon(familles).slice(0, 6);

  if (rayons.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[length:var(--texte-section)] font-bold leading-tight text-[color:var(--color-night)]">
          Explorer
        </h2>
        <Link
          href="/app/bibliotheque"
          className="shrink-0 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-brand)]"
        >
          Voir la bibliothèque
        </Link>
      </div>

      {/* La rangee deborde des marges de la page : la premiere tuile commence
          au bord du texte, la derniere peut sortir de l'ecran. C'est ce
          debord qui fait comprendre qu'il y a une suite. */}
      <div className="rail -mx-5 px-5">
        <ul className="flex w-max gap-2 pb-1">
          {rayons.map((famille, index) => (
            <li key={famille.id} className="w-[148px] shrink-0">
              <CollectionTile
                tile={{
                  id: famille.id,
                  slug: famille.slug,
                  name: famille.name,
                  count: famille.count,
                  apercus: famille.apercus,
                }}
                famille="Explorer"
                href={`/app/bibliotheque/famille/${famille.slug}`}
                montrerLeCompte={false}
                format="compact"
                priority={index < 3}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
