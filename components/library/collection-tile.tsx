import Link from 'next/link';
import { resumerPourCarte } from '@/lib/format/resume';
import { IllustrationDeRayon } from '@/components/library/illustration-rayon';
import type { CollectionTile as Tile } from '@/lib/catalog/types';

/**
 * La tuile d'un rayon : un dessin, un nom, ce qu'on y trouve.
 *
 * Elle montrait jusqu'ici une composition d'apercus — de vrais resultats du
 * rayon — surmontee du nom en blanc et d'un compteur. Deux choses n'allaient
 * pas, et aucune n'etait une question de gout.
 *
 * Un resultat de commande en tete d'une tuile de menu se lit comme un exemple
 * de ce qu'on obtiendra. Un rayon de creativite coiffe d'une chaussure
 * annoncait donc litteralement autre chose que ce qu'il contient. Le dessin
 * qui le remplace est abstrait : il nomme le rayon sans rien promettre. Les
 * photographies restent sur les cartes de commande, la ou elles montrent bien
 * un resultat.
 *
 * Et « 16 commandes » ne fait choisir personne : le chiffre ne dit pas si ce
 * qu'on cherche est derriere, il classe les rayons par taille et pousse vers
 * le plus gros. Une phrase le dit. Elle vient de la base, donc elle se corrige
 * sans redeploiement.
 *
 * La hauteur vient du contenu et non d'un rapport impose : deux lignes de
 * description sous un dessin en 8:5, ce qui donne des tuiles egales tant que
 * les phrases tiennent en deux lignes — et la reserve de deux lignes fait le
 * reste.
 */
export function CollectionTile({
  tile,
  famille,
  href,
}: {
  tile: Tile;
  famille: string;
  /**
   * Ou mene la tuile. Par defaut le rayon ; le premier palier de la
   * Bibliotheque s'en sert pour pointer une famille, qui a la meme forme.
   */
  href?: string;
}) {
  return (
    <Link
      href={href ?? `/app/bibliotheque/${tile.slug}`}
      className="group flex w-full flex-col overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] transition-transform duration-[var(--duration-fast)] active:scale-[0.985]"
    >
      <IllustrationDeRayon slug={tile.slug} nom={tile.name} />

      <span className="flex flex-1 flex-col gap-0.5 px-3 pb-3 pt-2.5">
        <span className="line-clamp-2 text-[length:var(--texte-titre-carte)] font-bold leading-[1.3] text-[color:var(--color-night)]">
          {tile.name}
        </span>
        {tile.description ? (
          /* Deux lignes reservees, toujours : sans cela une phrase courte et
             une phrase longue mettent leurs deux tuiles a des hauteurs
             differentes, et la grille part en escalier. */
          <span className="line-clamp-2 min-h-[2.6em] text-[length:var(--texte-meta)] leading-[1.3] text-[color:var(--color-muted)]">
            {resumerPourCarte(tile.description)}
          </span>
        ) : null}
      </span>

      {/* Pour un lecteur d'ecran, la famille situe le rayon : « Beaute » seul
          ne dit pas dans quel ensemble on entre. */}
      <span className="sr-only">
        {famille} — {tile.name}
      </span>
    </Link>
  );
}
