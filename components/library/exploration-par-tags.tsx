import Image from 'next/image';
import Link from 'next/link';
import { TAG_GROUP_LABELS } from '@/lib/constants';
import type { RayonDeTags, TagExplorable } from '@/lib/catalog/tags';

/**
 * L'entree de la Bibliotheque : les tags, et non l'arbre des rayons.
 *
 * Un rayon range une commande a une place et une seule. Une commande de
 * portrait vintage en studio vit donc dans « Portraits », et rien dans
 * l'arbre ne permettait de partir de « vintage » ou de « studio » — alors
 * que c'est souvent par la qu'on cherche.
 *
 * Les tags, eux, se croisent. La grille montre d'abord les plus portes, avec
 * leur visuel quand l'administration en a depose un ; le reste suit, groupe,
 * sous forme de puces. Aucun tag n'est ecrit ici : ce qui n'est porte par
 * aucune commande publiee n'apparait pas du tout.
 */

/** Huit en tete : deux colonnes, quatre rangees, et l'ecran n'est pas plein. */
const EN_TETE = 8;

export function ExplorationParTags({ rayons }: { rayons: RayonDeTags[] }) {
  const tous = rayons.flatMap((rayon) => rayon.tags);
  if (tous.length === 0) return null;

  // Les plus portes d'abord, en tuiles. Un tag mis en tete reste dans son
  // groupe plus bas : on le retrouve si l'on cherche par famille plutot que
  // par popularite.
  const enTete = [...tous].sort((a, b) => b.total - a.total).slice(0, EN_TETE);

  // Sauf quand la tete est deja tout ce qu'il y a. Repeter sous forme de
  // puces les quatre tuiles qu'on vient de montrer ne donne pas un second
  // chemin, seulement l'impression que la page bafouille. Le catalogue
  // compte quatre-vingt-dix-huit tags mais la plupart attendent encore
  // d'etre poses : cette section grandit d'elle-meme a mesure qu'ils le
  // sont, sans que rien ne soit a changer ici.
  const parGroupe = tous.length > EN_TETE ? rayons : [];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-[length:var(--texte-section)] font-bold leading-tight text-[color:var(--color-night)]">
          Explorer par tag
        </h2>
        <p className="mt-0.5 text-[length:var(--texte-carte)] leading-snug text-[color:var(--color-muted)]">
          Choisissez un tag, puis croisez-en d’autres pour resserrer.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-2 min-[400px]:gap-[var(--gouttiere-carte)]">
        {enTete.map((tag) => (
          <li key={tag.slug}>
            <CarteDeTag tag={tag} />
          </li>
        ))}
      </ul>

      {parGroupe.map((rayon) => (
        <div key={rayon.groupe}>
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
            {TAG_GROUP_LABELS[rayon.groupe]}
          </h3>
          {/* Des puces qui reviennent a la ligne, et non un rail : un rail
              cacherait la moitie des tags derriere un geste lateral, sur la
              page dont c'est precisement le sommaire. */}
          <ul className="mt-2 flex flex-wrap gap-2">
            {rayon.tags.map((tag) => (
              <li key={tag.slug}>
                <PuceDeTag tag={tag} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/**
 * Une carte de tag.
 *
 * Le visuel vient de l'administration. Sans visuel, la carte devient
 * typographique sur un fond de marque : un parti pris, pas une panne — et
 * elle garde exactement la meme hauteur, donc la grille ne part pas en
 * escalier selon ce qui a ete illustre.
 */
function CarteDeTag({ tag }: { tag: TagExplorable }) {
  return (
    <Link
      href={`/app/bibliotheque/tag/${tag.slug}`}
      className="relative flex aspect-[4/3] w-full flex-col justify-end overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-sky)] p-3 transition-transform duration-[var(--duration-fast)] active:scale-[0.985]"
    >
      {tag.imageUrl ? (
        <>
          <Image
            src={tag.imageUrl}
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 430px) 50vw, 220px"
            className="object-cover"
          />
          {/* Le texte se pose sur un fondu et non sur l'image nue : un nom
              blanc sur un visuel clair ne se lit pas. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
          />
        </>
      ) : null}

      <span className="relative">
        <span
          className={`block text-[length:var(--texte-titre-carte)] font-bold leading-[1.25] ${
            tag.imageUrl ? 'text-white' : 'text-[color:var(--color-night)]'
          }`}
        >
          {tag.nom}
        </span>
        <span
          className={`block text-[length:var(--texte-meta)] ${
            tag.imageUrl ? 'text-white/80' : 'text-[color:var(--color-muted)]'
          }`}
        >
          {tag.total} commande{tag.total > 1 ? 's' : ''}
        </span>
      </span>
    </Link>
  );
}

function PuceDeTag({ tag }: { tag: TagExplorable }) {
  return (
    <Link
      href={`/app/bibliotheque/tag/${tag.slug}`}
      className="touch-target inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[color:var(--color-sky)] px-3.5 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-night)]"
    >
      {tag.nom}
      <span className="text-[color:var(--color-muted)]">{tag.total}</span>
    </Link>
  );
}
