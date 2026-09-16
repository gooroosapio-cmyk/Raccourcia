import Link from 'next/link';
import { Icone } from '@/components/ui/icone';
import { iconeDuRole } from '@/lib/ui/icones';
import type { LibraryFamily } from '@/lib/catalog/types';

/**
 * Les deux facons de se servir de RaccourcIA, en tete de Bibliotheque.
 *
 * Un Mode IA conditionne une conversation ; un Parcours guide livre une serie
 * de fichiers. Ce ne sont pas des sujets ranges a cote des portraits : on ne
 * les cherche pas de la meme facon et on ne les lance pas du meme geste.
 * Melanges aux rayons, ils passaient pour deux categories de plus.
 *
 * Deux raccourcis et non deux tuiles pleines. Au gabarit des rayons ils
 * occupaient un tiers du premier ecran, ce qui repoussait le catalogue sous
 * la ligne de flottaison et leur donnait l'importance d'une famille entiere.
 * Une ligne suffit a dire ce qu'ils sont ; la fiche dira le reste.
 */
export function FaconsDUtiliser({
  modesIa,
  parcours,
}: {
  modesIa?: LibraryFamily;
  parcours?: LibraryFamily;
}) {
  if (!modesIa && !parcours) return null;

  return (
    <section className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 min-[400px]:gap-[var(--gouttiere-carte)]">
      {modesIa ? (
        <Facon
          href={`/app/bibliotheque/famille/${modesIa.slug}`}
          titre="Modes IA"
          promesse="Réfléchir, écrire, s’entraîner"
          svg={iconeDuRole('mode')}
          ton="mode"
        />
      ) : null}
      {parcours ? (
        <Facon
          href={`/app/bibliotheque/famille/${parcours.slug}`}
          titre="Parcours guidés"
          promesse="Un objectif, plusieurs livrables"
          svg={iconeDuRole('journey')}
          ton="parcours"
        />
      ) : null}
    </section>
  );
}

/**
 * Deux teintes proches mais distinctes.
 *
 * La lavande designe les modes partout dans l'application ; le bleu tres pale
 * designe les parcours. Les poser cote a cote ici apprend la convention a
 * l'endroit ou on la rencontre pour la premiere fois.
 */
const TONS = {
  mode: 'border-[color:var(--color-mode-bord)] bg-[color:var(--color-mode-fond)]',
  parcours: 'border-[color:var(--color-parcours-bord)] bg-[color:var(--color-parcours-fond)]',
} as const;

function Facon({
  href,
  titre,
  promesse,
  svg,
  ton,
}: {
  href: string;
  titre: string;
  promesse: string;
  svg: string;
  ton: keyof typeof TONS;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[88px] w-full items-center gap-3 rounded-[color:var(--radius-card)] border px-3 py-2.5 transition-transform duration-[var(--duration-fast)] active:scale-[0.985] ${TONS[ton]}`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-surface)] text-[color:var(--color-brand)]">
        <Icone svg={svg} taille={22} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[length:var(--texte-titre-carte)] font-bold leading-tight text-[color:var(--color-night)]">
          {titre}
        </span>
        <span className="text-[length:var(--texte-meta)] leading-[1.3] text-[color:var(--color-muted)]">
          {promesse}
        </span>
      </span>
    </Link>
  );
}
