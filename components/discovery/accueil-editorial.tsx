import { CollectionsPopulaires } from '@/components/accueil/collections-populaires';
import { NosBibliotheques } from '@/components/accueil/nos-bibliotheques';
import {
  IconeBibliotheques,
  IconeCollections,
  IconeRecemment,
  IconeTendances,
  TitreDeSection,
} from '@/components/accueil/titre-de-section';
import { FeedDecouverte } from '@/components/feed/feed-decouverte';
import { PromptGrid } from '@/components/cards/prompt-grid';
import { chargerLesTendances } from '@/lib/actions/tendances';
import { traitsDesRayons } from '@/lib/catalog/rayons';
import type { CollectionPopulaire } from '@/lib/catalog/accueil';
import type { LibraryFamily, PromptCard } from '@/lib/catalog/types';

/**
 * L'accueil quand rien n'est encore filtre.
 *
 * Quatre etages, dans l'ordre ou l'on s'en sert :
 *
 *   1. par quelle bibliotheque entrer — image, texte ou conversation ;
 *   2. quelles collections valent le detour ;
 *   3. ce qu'on a copie en dernier, pour y revenir sans chercher ;
 *   4. la galerie, qui ne s'arrete plus.
 *
 * Les collections ont remplace les categories. Une categorie est un
 * tiroir : « Portraits et photographie » ne fait choisir personne, parce
 * qu'elle contient tout et son contraire. Une collection est une intention
 * de recherche — « Portrait et editorial », « Liens et souvenirs » — et
 * c'est a ce niveau qu'on sait si ce qu'on cherche est derriere.
 *
 * Chaque titre porte un signe. L'accueil empile quatre sections de formes
 * proches, et sur un telephone on les parcourt au pouce sans lire les
 * titres : un signe en tete de ligne se reconnait plus vite qu'un mot.
 */
export function AccueilEditorial({
  feed,
  reprendre,
  familles,
  collections,
  locked,
  visiteur,
}: {
  feed: PromptCard[];
  reprendre: PromptCard[];
  familles: LibraryFamily[];
  collections: CollectionPopulaire[];
  locked: boolean;
  visiteur: boolean;
}) {
  // Une carte connait sa collection, jamais sa famille. L'accueil charge
  // deja la bibliotheque entiere : il resout le trait de chaque rayon une
  // fois et le passe aux galeries, plutot qu'une jointure a deux etages par
  // lecture.
  const rayons = traitsDesRayons(familles);

  return (
    <div className="space-y-6 pt-1">
      <section className="space-y-2.5">
        <TitreDeSection
          titre="Nos bibliothèques"
          icone={<IconeBibliotheques />}
          href="/app/bibliotheque"
        />
        <NosBibliotheques />
      </section>

      {collections.length > 0 ? (
        <section className="space-y-2.5">
          <TitreDeSection
            titre="Collections populaires"
            icone={<IconeCollections />}
            href="/app/bibliotheque"
          />
          <CollectionsPopulaires collections={collections} />
        </section>
      ) : null}

      {reprendre.length > 0 ? (
        <section className="space-y-2">
          {/* « Copiees recemment », et non « Reprendre ». Rien n'est repris :
              l'application ne sait pas ou en est la conversation qu'on a
              menee ailleurs, et un titre qui le laisse croire promet une
              continuite qui n'existe pas. Ce qu'elle sait, c'est ce qu'on a
              copie — et c'est deja ce qu'on revient chercher. */}
          <TitreDeSection
            titre="Copiées récemment"
            icone={<IconeRecemment />}
            href="/app/recents"
            action="Tout l’historique"
          />
          {/* Les dix dernieres commandes copiees, et non ouvertes : on ouvre
              dix fiches pour en retenir une, mais on ne copie que ce dont on
              s'est servi. En carrousel — dix cartes en colonne pousseraient
              la galerie hors de l'ecran. */}
          <PromptGrid
            prompts={reprendre}
            locked={locked}
            visiteur={visiteur}
            disposition="rangee"
            prioritaire={false}
            rayons={rayons}
            emptyState={null}
          />
        </section>
      ) : null}

      {feed.length > 0 ? (
        <section className="space-y-2">
          <TitreDeSection titre="Tendances du moment" icone={<IconeTendances />} />
          {/* La galerie ne s'arrete plus au vivier de la page. Elle bornait
              a soixante cartes, et rien ne disait qu'il en existait six
              cents de plus : on croyait avoir fait le tour du catalogue au
              bout de deux ecrans. */}
          <FeedDecouverte
            prompts={feed}
            locked={locked}
            visiteur={visiteur}
            rayons={rayons}
            chargerLaSuite={chargerLesTendances}
            filtrable
          />
        </section>
      ) : null}
    </div>
  );
}
