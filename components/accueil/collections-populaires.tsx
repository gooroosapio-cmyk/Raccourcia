import Image from 'next/image';
import Link from 'next/link';
import type { CollectionPopulaire } from '@/lib/catalog/accueil';

/**
 * Les collections mises en avant, en une rangee qui defile.
 *
 * Elles remplacent les categories. Une categorie est un tiroir :
 * « Portraits et photographie » ne fait choisir personne, parce qu'elle
 * contient tout et son contraire. Une collection est une intention de
 * recherche — « Portrait et editorial », « Liens et souvenirs » — et c'est
 * a ce niveau qu'on sait si ce qu'on cherche est derriere.
 *
 * Une rangee et non une grille : dix tuiles en grille occupent deux ecrans
 * entiers avant la galerie, et l'accueil cesse d'etre une porte pour
 * devenir un sommaire. On en voit deux et demie, le pouce fait le reste.
 *
 * Le classement vient de la base — epingle, montrable, aime, volume — et
 * jamais d'ici : changer l'ordre en administration doit suffire.
 */
export function CollectionsPopulaires({ collections }: { collections: CollectionPopulaire[] }) {
  if (collections.length === 0) return null;

  return (
    <div className="rail -mx-5 px-5">
      <ul className="flex w-max gap-2 pb-1 min-[400px]:gap-[var(--gouttiere-carte)]">
        {collections.map((collection, rang) => (
          <li key={collection.slug} className="w-[168px] shrink-0 min-[400px]:w-[184px]">
            <Link
              href={`/app/bibliotheque/${collection.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] transition-transform duration-[var(--duration-fast)] active:scale-[0.985]"
            >
              <span className="relative block aspect-[16/10] w-full overflow-hidden bg-[color:var(--color-sky)]">
                {collection.apercuUrl ? (
                  <Image
                    src={collection.apercuUrl}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="184px"
                    // Les deux premieres seulement : au-dela, la rangee
                    // sort de l'ecran et rien ne presse.
                    priority={rang < 2}
                    className="object-cover"
                  />
                ) : (
                  /* Sans visuel, la tuile reste typographique plutot que
                     vide : un parti pris, pas une panne. */
                  <span className="flex h-full items-end p-2.5 text-[length:var(--texte-meta)] font-semibold uppercase tracking-wide text-[color:var(--color-brand)]">
                    {collection.famille}
                  </span>
                )}
              </span>

              <span className="flex flex-1 flex-col gap-0.5 px-3 pb-3 pt-2.5">
                <span className="text-[length:var(--texte-meta)] font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
                  {collection.famille}
                </span>
                <span className="line-clamp-2 text-[length:var(--texte-titre-carte)] font-bold leading-[1.3] text-[color:var(--color-night)]">
                  {collection.nom}
                </span>
                <span className="mt-auto pt-1 text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
                  {collection.total} commande{collection.total > 1 ? 's' : ''}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
