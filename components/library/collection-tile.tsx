import Link from 'next/link';
import Image from 'next/image';
import type { CollectionTile as Tile } from '@/lib/catalog/types';

/**
 * Tuile d'une collection : une image, un nom pose dessus.
 *
 * C'est la forme que prend une bibliotheque qu'on parcourt du pouce. Le nom
 * est en blanc sur un voile sombre plutot que sous l'image : deux colonnes
 * sur un ecran de 360 px ne laissent pas la place a une legende, et une
 * grille ou chaque tuile a la meme hauteur ne saute pas au chargement.
 *
 * Le voile n'est pas un effet : sans lui, « Portrait pro » posé sur un
 * visage clair devient illisible. Il est plus dense en bas, la ou le texte
 * se trouve, et laisse l'image respirer en haut.
 *
 * Sans visuel, la tuile ne montre pas un cadre vide. Le catalogue V2 arrive
 * sans images et la plupart des collections n'en auront pas avant
 * longtemps : une tuile typographique, dans les bleus de la marque, dit la
 * meme chose sans avoir l'air cassee. La teinte suit le nom, donc elle ne
 * bouge pas d'un chargement a l'autre.
 */
export function CollectionTile({ tile, famille }: { tile: Tile; famille: string }) {
  return (
    <Link
      href={`/app/bibliotheque/${tile.slug}`}
      className="group relative flex aspect-[16/10] w-full items-end overflow-hidden rounded-[color:var(--radius-card)] bg-[color:var(--color-sky)]"
    >
      {tile.imageUrl ? (
        <>
          <Image
            src={tile.imageUrl}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, 240px"
            className="object-cover"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/5"
          />
        </>
      ) : (
        <span aria-hidden="true" className={`absolute inset-0 ${teinte(tile.name)}`} />
      )}

      <span className="relative flex w-full flex-col gap-0.5 p-3">
        <span
          className={`line-clamp-2 text-[15px] font-bold leading-tight ${
            tile.imageUrl ? 'text-white [text-shadow:0_1px_3px_rgb(0_0_0/45%)]' : 'text-white'
          }`}
        >
          {tile.name}
        </span>
        <span
          className={`text-[length:var(--texte-meta)] font-medium ${
            tile.imageUrl ? 'text-white/85' : 'text-white/80'
          }`}
        >
          {tile.count} commande{tile.count > 1 ? 's' : ''}
        </span>
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
 * Une teinte stable pour une collection sans visuel.
 *
 * Tiree du nom et non d'un hasard : la meme collection garde la meme couleur
 * d'un ecran a l'autre, et la grille ne clignote pas au rechargement. Quatre
 * degrades, tous dans les bleus de la marque — une tuile sans image reste
 * une tuile de RaccourcIA, pas un trou colore.
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
