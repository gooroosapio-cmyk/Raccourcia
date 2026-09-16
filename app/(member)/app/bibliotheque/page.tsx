import Link from 'next/link';
import { getBibliotheque } from '@/lib/catalog/queries';
import { CollectionTile } from '@/components/library/collection-tile';
import {
  FAMILLE_MODES_IA,
  FAMILLE_PARCOURS,
  famillesDeRayon,
  familleSpeciale,
} from '@/lib/catalog/familles-speciales';
import { NetworkError } from '@/components/ui/network-error';
import { EmptyState } from '@/components/ui/states';
import { isCatalogUnavailable } from '@/lib/catalog/errors';

export const metadata = { title: 'Bibliothèque' };

/**
 * Premier palier de la Bibliotheque : les familles, et rien d'autre.
 *
 * On n'entre pas dans un catalogue de sept cents commandes par une grille de
 * sept cents cartes. On y entre par ce qu'on veut faire : une famille, puis
 * une collection, puis les commandes. Trois paliers, deux touches.
 *
 * Cette page montrait les huit familles avec leurs cinquante-trois
 * collections deployees : une page qu'on faisait defiler longtemps avant
 * d'avoir tout vu, et ou le deuxieme palier ne servait a rien.
 *
 * Les familles viennent de la base, jamais d'une liste ecrite ici : en
 * ajouter une en administration la fait apparaitre sans redeploiement.
 */
export default async function BibliothequePage() {
  let familles: Awaited<ReturnType<typeof getBibliotheque>>;

  try {
    familles = await getBibliotheque();
  } catch (error) {
    if (isCatalogUnavailable(error)) {
      return (
        <div className="space-y-4 pt-1">
          <Entete />
          <NetworkError />
        </div>
      );
    }
    throw error;
  }

  // Les six rayons d'un cote, les deux facons de s'en servir de l'autre. Un
  // Mode IA n'est pas un sujet range a cote des portraits : on ne le cherche
  // pas de la meme facon et on ne le lance pas avec le meme geste. Melanges
  // dans la meme grille, ils passaient pour deux rayons de plus.
  const rayons = famillesDeRayon(familles);
  const modesIa = familleSpeciale(familles, FAMILLE_MODES_IA);
  const parcours = familleSpeciale(familles, FAMILLE_PARCOURS);

  return (
    <div className="space-y-7 pt-1">
      <Entete />

      {familles.length === 0 ? (
        <EmptyState
          title="La bibliothèque est vide"
          body="Aucune collection n’est ouverte pour le moment."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 min-[400px]:gap-[var(--gouttiere-carte)]">
          {rayons.map((famille, index) => (
            <CollectionTile
              key={famille.id}
              tile={{
                id: famille.id,
                slug: famille.slug,
                name: famille.name,
                count: famille.count,
                apercus: famille.apercus,
              }}
              famille="Bibliothèque"
              href={`/app/bibliotheque/famille/${famille.slug}`}
              // La premiere rangee seulement : elle est la seule certaine
              // d'etre a l'ecran au chargement.
              priority={index < 2}
            />
          ))}
        </div>
      )}

      {modesIa || parcours ? (
        <section className="space-y-2">
          <h2 className="text-[length:var(--texte-section)] font-bold leading-tight text-[color:var(--color-night)]">
            Autrement qu’en images
          </h2>
          <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
            {modesIa ? (
              <AccesSecondaire
                slug={modesIa.slug}
                titre="Modes IA"
                promesse="Des conversations qui vous posent les bonnes questions."
              />
            ) : null}
            {parcours ? (
              <AccesSecondaire
                slug={parcours.slug}
                titre="Parcours guidés"
                promesse="Plusieurs livrables, du premier brief à la version finale."
              />
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/**
 * L'acces a une famille qui n'est pas un rayon.
 *
 * Sans couverture : ces deux-la ne se choisissent pas sur une image, et leur
 * en donner une les ferait rentrer dans le rang des rayons juste au-dessus.
 * Une phrase dit ce qu'on y trouve, ce qu'un visuel ne saurait pas faire pour
 * une conversation.
 */
function AccesSecondaire({
  slug,
  titre,
  promesse,
}: {
  slug: string;
  titre: string;
  promesse: string;
}) {
  return (
    <Link
      href={`/app/bibliotheque/famille/${slug}`}
      className="touch-target flex flex-col justify-center gap-0.5 rounded-[color:var(--radius-card)] border border-[color:var(--color-brand)]/25 bg-[color:var(--color-brand-soft)] px-3.5 py-3.5 transition-transform duration-[var(--duration-fast)] active:scale-[0.99]"
    >
      <span className="text-[length:var(--texte-corps)] font-bold leading-tight text-[color:var(--color-brand-strong)]">
        {titre}
      </span>
      <span className="text-[length:var(--texte-carte)] leading-snug text-[color:var(--color-night)]/70">
        {promesse}
      </span>
    </Link>
  );
}

function Entete() {
  return (
    <div>
      <h1 className="text-[length:var(--texte-page)] font-bold leading-tight text-[color:var(--color-night)]">
        Toute la bibliothèque
      </h1>
      <p className="mt-1 text-[length:var(--texte-corps)] leading-relaxed text-[color:var(--color-muted)]">
        Parcourez les commandes par catégorie et par collection.
      </p>
    </div>
  );
}
