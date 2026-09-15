import Link from 'next/link';
import { PromptGrid } from '@/components/cards/prompt-grid';
import { CollectionTile } from '@/components/library/collection-tile';
import type { LibraryFamily, PromptCard } from '@/lib/catalog/types';

/**
 * L'Accueil quand rien n'est encore cherche.
 *
 * Il presente au lieu de lister. Quatre rangees, dans l'ordre ou l'on s'en
 * sert : ce qu'on met en avant, par ou explorer, ce qui vient d'arriver, ce
 * qu'on a laisse en route.
 *
 * Chaque rangee ne s'affiche que si elle a de quoi : un Accueil avec trois
 * titres et trois vides donne l'impression d'un produit en panne. « Reprendre »
 * n'existe donc pas pour qui vient d'arriver, et c'est tres bien.
 *
 * Il n'y a pas de rangee « les plus utilisees » : le compte des copies vit
 * dans une table fermee au membre, et une popularite devinee vaudrait moins
 * que pas de rangee du tout.
 */
export function AccueilEditorial({
  miseEnAvant,
  nouveautes,
  reprendre,
  familles,
  locked,
  visiteur,
}: {
  miseEnAvant: PromptCard[];
  nouveautes: PromptCard[];
  reprendre: PromptCard[];
  familles: LibraryFamily[];
  locked: boolean;
  visiteur: boolean;
}) {
  const commun = { locked, visiteur, prioritaire: false, disposition: 'rangee' as const };

  // Une collection par famille, la premiere qui porte quelque chose : la
  // rangee montre l'etendue du catalogue, pas le detail d'un seul rayon.
  const collections = familles
    .map((famille) => famille.collections.find((collection) => collection.count > 0))
    .filter((collection) => collection !== undefined);

  return (
    <div className="space-y-7 pt-1">
      {miseEnAvant.length > 0 ? (
        <Rangee titre="Sélection du moment">
          <PromptGrid {...commun} prompts={miseEnAvant} prioritaire emptyState={null} />
        </Rangee>
      ) : null}

      {collections.length > 0 ? (
        <Rangee titre="Explorer par collection" lien="/app/bibliotheque" libelleLien="Tout voir">
          <div className="rail -mx-5 flex snap-x snap-mandatory gap-2 px-5 pb-1">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="w-[58%] shrink-0 snap-start sm:w-[38%] lg:w-[24%]"
              >
                <CollectionTile
                  tile={collection}
                  famille={
                    familles.find((f) => f.collections.some((c) => c.id === collection.id))?.name ??
                    ''
                  }
                />
              </div>
            ))}
          </div>
        </Rangee>
      ) : null}

      {nouveautes.length > 0 ? (
        <Rangee titre="Nouvelles commandes">
          <PromptGrid {...commun} prompts={nouveautes} emptyState={null} />
        </Rangee>
      ) : null}

      {reprendre.length > 0 ? (
        <Rangee titre="Reprendre" lien="/app/recents" libelleLien="Tout l’historique">
          <PromptGrid {...commun} prompts={reprendre} emptyState={null} />
        </Rangee>
      ) : null}
    </div>
  );
}

function Rangee({
  titre,
  lien,
  libelleLien,
  children,
}: {
  titre: string;
  lien?: string;
  libelleLien?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[length:var(--texte-section)] font-bold leading-tight text-[color:var(--color-night)]">
          {titre}
        </h2>
        {lien ? (
          <Link
            href={lien}
            className="shrink-0 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-brand)]"
          >
            {libelleLien}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
