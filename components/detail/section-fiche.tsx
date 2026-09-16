import type { ReactNode } from 'react';

/**
 * Le rang du titre dans le document qui accueille la section.
 *
 * La fiche en bottom sheet ouvre sur un `h2` — elle est une couche au-dessus
 * d'une page qui a deja son `h1` — tandis que la page publique d'une commande
 * est cette page et porte le `h1`. Les memes sections servent aux deux : sans
 * ce reglage, l'une des deux sautait un rang, et un lecteur d'ecran qui
 * navigue de titre en titre y perd la structure.
 */
export type NiveauDeTitre = 2 | 3;

/**
 * Un bloc de la fiche : un intitule discret, puis son contenu.
 *
 * Partage entre la fiche d'une commande image et celles d'un Mode IA ou d'un
 * Parcours : les trois posent des questions differentes, mais elles les
 * posent de la meme facon, et deux gabarits qui divergent d'un pixel se
 * remarquent des qu'on passe de l'une a l'autre.
 */
export function Section({
  titre,
  niveau = 3,
  children,
}: {
  titre: string;
  niveau?: NiveauDeTitre;
  children: ReactNode;
}) {
  const Titre = niveau === 2 ? 'h2' : 'h3';

  return (
    <section className={niveau === 2 ? 'mt-6' : 'mt-5'}>
      <Titre className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
        {titre}
      </Titre>
      {children}
    </section>
  );
}

/** Une liste a puces, au meme gabarit partout dans la fiche. */
export function ListePuces({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2 text-[length:var(--texte-carte)] leading-snug text-[color:var(--color-night)]"
        >
          <span
            aria-hidden="true"
            className="mt-[0.5em] block h-1 w-1 shrink-0 rounded-full bg-[color:var(--color-brand)]"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
