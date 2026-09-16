import Link from 'next/link';
import Image from 'next/image';
import type { CollectionTile as Tile } from '@/lib/catalog/types';

/**
 * Couverture d'un rayon : une composition d'apercus, un nom pose dessus.
 *
 * C'est la forme que prend une bibliotheque qu'on parcourt du pouce. Le nom
 * est en blanc sur un voile sombre plutot que sous les images : deux colonnes
 * sur un ecran de 360 px ne laissent pas la place a une legende, et une
 * grille ou chaque tuile a la meme hauteur ne saute pas au chargement.
 *
 * La composition vient de la collection elle-meme : un grand apercu a gauche,
 * deux petits a droite quand ils existent. Une image unique ne disait rien de
 * ce qu'il y avait derriere, et deux rayons voisins tombaient sur la meme —
 * « Produit et e-commerce » et « Publicité et marque » partageaient leur
 * couverture. Ce sont de vrais resultats du rayon, jamais une illustration
 * choisie ailleurs.
 *
 * Sans apercu, la tuile ne montre pas un cadre vide. Le catalogue V2 arrive
 * sans images et la plupart des collections n'en auront pas avant longtemps :
 * une tuile typographique, dans les bleus de la marque, dit la meme chose
 * sans avoir l'air cassee. La teinte suit le nom, donc elle ne bouge pas d'un
 * chargement a l'autre.
 */
export function CollectionTile({
  tile,
  famille,
  href,
  montrerLeCompte = true,
  format = 'large',
  priority = false,
}: {
  tile: Tile;
  famille: string;
  /**
   * Ou mene la tuile. Par defaut la collection ; le premier palier de la
   * Bibliotheque s'en sert pour pointer une famille, qui a la meme forme.
   */
  href?: string;
  /**
   * Afficher « 72 commandes » sous le nom.
   *
   * Vrai en bibliotheque, ou l'on compare des rayons avant d'y entrer. Faux
   * sur l'Accueil : un nombre n'y aide personne a choisir, il classe les
   * rayons par taille et pousse vers le plus gros.
   */
  montrerLeCompte?: boolean;
  /**
   * `compact` pour une tuile de ruban horizontal : elle laisse voir la
   * suivante sur un ecran de 360 px.
   */
  format?: 'large' | 'compact';
  /** Vrai pour les tuiles de la premiere rangee seulement. */
  priority?: boolean;
}) {
  const compact = format === 'compact';
  const apercus = tile.apercus.slice(0, 3);

  return (
    <Link
      href={href ?? `/app/bibliotheque/${tile.slug}`}
      className={`group relative flex w-full items-end overflow-hidden rounded-[color:var(--radius-card)] bg-[color:var(--color-sky)] transition-transform duration-[var(--duration-fast)] active:scale-[0.985] ${
        compact ? 'aspect-[4/3]' : 'aspect-[16/11]'
      }`}
    >
      {apercus.length > 0 ? (
        <>
          <Composition apercus={apercus} priority={priority} />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
          />
        </>
      ) : (
        <span aria-hidden="true" className={`absolute inset-0 ${teinte(tile.name)}`} />
      )}

      <span className={`relative flex w-full flex-col gap-0.5 ${compact ? 'p-2.5' : 'p-3'}`}>
        <span
          className={`line-clamp-2 font-bold leading-tight text-white ${
            compact ? 'text-[13px]' : 'text-[15px]'
          } ${apercus.length > 0 ? '[text-shadow:0_1px_3px_rgb(0_0_0/45%)]' : ''}`}
        >
          {tile.name}
        </span>
        {montrerLeCompte ? (
          <span className="text-[length:var(--texte-meta)] font-medium text-white/85">
            {tile.count} commande{tile.count > 1 ? 's' : ''}
          </span>
        ) : null}
      </span>

      {/* Pour un lecteur d'ecran, la famille situe la collection : « Beaute »
          seul ne dit pas dans quel rayon on entre. */}
      <span className="sr-only">
        {famille} — {tile.name}
      </span>
    </Link>
  );
}

/**
 * Un, deux ou trois apercus dans un seul cadre.
 *
 * La composition suit ce qu'il y a, et non l'inverse : un apercu occupe tout
 * le cadre, deux se partagent la largeur, trois donnent un grand a gauche et
 * deux empiles a droite. Rien n'est etire ni complete par un remplissage —
 * une couverture doit montrer des resultats, pas des trous.
 */
function Composition({ apercus, priority }: { apercus: string[]; priority: boolean }) {
  if (apercus.length === 1) {
    return <Apercu url={apercus[0]!} sizes="(max-width: 640px) 50vw, 260px" priority={priority} />;
  }

  if (apercus.length === 2) {
    return (
      <span aria-hidden="true" className="absolute inset-0 grid grid-cols-2 gap-px">
        {apercus.map((url) => (
          <span key={url} className="relative overflow-hidden">
            <Apercu url={url} sizes="(max-width: 640px) 25vw, 130px" priority={priority} />
          </span>
        ))}
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="absolute inset-0 grid grid-cols-[1.6fr_1fr] gap-px">
      <span className="relative overflow-hidden">
        <Apercu url={apercus[0]!} sizes="(max-width: 640px) 32vw, 160px" priority={priority} />
      </span>
      <span className="grid grid-rows-2 gap-px">
        {apercus.slice(1, 3).map((url) => (
          <span key={url} className="relative overflow-hidden">
            <Apercu url={url} sizes="(max-width: 640px) 20vw, 100px" priority={false} />
          </span>
        ))}
      </span>
    </span>
  );
}

function Apercu({ url, sizes, priority }: { url: string; sizes: string; priority: boolean }) {
  return (
    <Image
      src={url}
      alt=""
      fill
      // Le stockage a deja rendu la vignette a la bonne largeur. L'optimiseur
      // de l'hebergeur, lui, a un quota mensuel : epuise, il repond « Payment
      // Required » et la couverture disparait.
      unoptimized
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      className="object-cover"
    />
  );
}

/**
 * Une teinte stable pour un rayon sans apercu.
 *
 * Tiree du nom et non d'un hasard : le meme rayon garde la meme couleur d'un
 * ecran a l'autre, et la grille ne clignote pas au rechargement. Quatre
 * degrades, tous dans les bleus de la marque — une tuile sans image reste une
 * tuile de RaccourcIA, pas un trou colore.
 */
function teinte(nom: string): string {
  const degrades = [
    'bg-gradient-to-br from-[#1463ff] to-[#0b163f]',
    'bg-gradient-to-br from-[#4f8cff] to-[#1463ff]',
    'bg-gradient-to-br from-[#0f4fd8] to-[#0b163f]',
    'bg-gradient-to-br from-[#2b7cff] to-[#123a8f]',
  ];
  let somme = 0;
  for (const caractere of nom) somme = (somme + caractere.charCodeAt(0)) % 997;
  return degrades[somme % degrades.length]!;
}
