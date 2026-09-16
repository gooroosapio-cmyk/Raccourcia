import Link from 'next/link';
import type { LibraryFamily } from '@/lib/catalog/types';

/**
 * Les deux facons de se servir de RaccourcIA, en tete de Bibliotheque.
 *
 * Un Mode IA conditionne une conversation ; un Parcours guide livre une
 * serie de visuels. Ce ne sont pas des sujets ranges a cote des portraits :
 * on ne les cherche pas de la meme facon et on ne les lance pas du meme
 * geste. Melanges aux rayons, ils passaient pour deux categories de plus et
 * personne ne les trouvait.
 *
 * Meme gabarit que les tuiles d'en dessous — la page garde son rythme — mais
 * sans couverture : ces deux-la ne se choisissent pas sur une image. Une
 * icone et une phrase disent ce qu'une photographie ne saurait pas dire
 * d'une conversation.
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
    <section className="grid grid-cols-2 gap-2 min-[400px]:gap-[var(--gouttiere-carte)]">
      {modesIa ? (
        <Facon
          slug={modesIa.slug}
          titre="Modes IA"
          promesse="Donnez un rôle à votre IA"
          icone={<IconeConversation />}
        />
      ) : null}
      {parcours ? (
        <Facon
          slug={parcours.slug}
          titre="Parcours guidés"
          promesse="Un objectif, plusieurs étapes"
          icone={<IconeEtapes />}
        />
      ) : null}
    </section>
  );
}

function Facon({
  slug,
  titre,
  promesse,
  icone,
}: {
  slug: string;
  titre: string;
  promesse: string;
  icone: React.ReactNode;
}) {
  return (
    <Link
      href={`/app/bibliotheque/famille/${slug}`}
      className="flex aspect-[16/11] w-full flex-col justify-end gap-1 rounded-[color:var(--radius-card)] border border-[color:var(--color-brand)]/25 bg-[color:var(--color-brand-soft)] p-3 transition-transform duration-[var(--duration-fast)] active:scale-[0.985]"
    >
      <span className="mb-auto flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--color-brand)] text-white">
        {icone}
      </span>
      <span className="text-[15px] font-bold leading-tight text-[color:var(--color-brand-strong)]">
        {titre}
      </span>
      <span className="text-[length:var(--texte-meta)] leading-tight text-[color:var(--color-night)]/70">
        {promesse}
      </span>
    </Link>
  );
}

/** Deux bulles : on parle avec un mode, on ne le regarde pas. */
function IconeConversation() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h7A2.5 2.5 0 0 1 16 6.5v3A2.5 2.5 0 0 1 13.5 12H9l-3.5 2.5v-2.7A2.5 2.5 0 0 1 4 9.5v-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M18 9.5h.5A2.5 2.5 0 0 1 21 12v3a2.5 2.5 0 0 1-1.5 2.3V20L16 17.5h-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Des paliers : un parcours avance et rend plusieurs choses en chemin. */
function IconeEtapes() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 19h4v-4H3v4ZM10 19h4V10h-4v9ZM17 19h4V5h-4v14Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
