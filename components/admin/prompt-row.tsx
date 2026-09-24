import Image from 'next/image';
import Link from 'next/link';

import { MediaBadge } from '@/components/ui/media-badge';
import { PromptRowActions } from '@/components/admin/prompt-row-actions';
import { StatusBadge } from '@/components/ui/status-badge';
import { LIBRARY_LABELS, MODE_LABELS } from '@/lib/constants';
import type { AdminPromptRow } from '@/lib/admin/queries';

/**
 * Une ligne de la liste des raccourcis, cote administration.
 *
 * Elle est batie autour d'une question : « est-ce celui-la que je cherche ? »
 * Dans une liste de six cents entrees, le nom seul ne suffit pas — deux
 * raccourcis voisins portent des titres voisins. L'apercu du resultat, lui,
 * se reconnait sans etre lu. C'est pour cela qu'il tient la premiere place et
 * qu'il est assez grand pour qu'on distingue ce qu'il montre.
 *
 * Le reste suit l'ordre dans lequel on en a besoin : le titre, puis la
 * commande, puis ou elle est rangee, puis son etat. Les trois gestes rapides
 * restent en bas a droite, la ou le pouce les atteint sans couvrir le texte.
 */
/**
 * Une ligne de la liste d'administration.
 *
 * Elle rend un cadre, pas un element de liste : c'est l'appelant qui decide
 * si elle vit dans un `<ul>` ou a cote d'une case a cocher. Elle portait son
 * propre `<li>`, ce qui interdisait de la poser dans une ligne avec autre
 * chose — un `<li>` dans un `<li>` n'est pas du HTML valide.
 */
export function AdminPromptRowItem({ prompt }: { prompt: AdminPromptRow }) {
  return (
    <>
      <LigneDeTableau prompt={prompt} />
      <div className="lg:hidden">
        <CarteMobile prompt={prompt} />
      </div>
    </>
  );
}

/**
 * Ordinateur : une ligne de tableau (rapport de refonte, p. 11) — commande,
 * collection, acces, statut, actions, lisibles d'un balayage vertical.
 */
function LigneDeTableau({ prompt }: { prompt: AdminPromptRow }) {
  return (
    <div className="hidden grid-cols-[48px_minmax(0,2.2fr)_minmax(0,1.4fr)_88px_110px_auto] items-center gap-3 rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-2.5 py-2 lg:grid">
      <Link href={`/admin/raccourcis/${prompt.id}`} aria-hidden="true" tabIndex={-1}>
        <span className="block h-12 w-12 overflow-hidden rounded-[8px] [&>*]:!h-12 [&>*]:!w-12">
          <Apercu url={prompt.afterUrl} mode={prompt.mode} />
        </span>
      </Link>
      <Link href={`/admin/raccourcis/${prompt.id}`} className="min-w-0">
        <span className="block truncate text-[15px] font-semibold text-[color:var(--color-night)]">
          {prompt.name}
        </span>
        <span className="commande block truncate text-[13px] text-[color:var(--color-brand)]">
          {prompt.command}
          {prompt.cardSlug ? (
            <span className="text-[12px] text-[color:var(--color-muted)]">
              {' '}
              · {prompt.cardSlug}
            </span>
          ) : null}
        </span>
      </Link>
      <span className="truncate text-[13px] text-[color:var(--color-muted)]">
        {prompt.library ? LIBRARY_LABELS[prompt.library] : MODE_LABELS[prompt.mode]}
        {prompt.categoryName ? ` · ${prompt.categoryName}` : ' · sans collection'}
      </span>
      <span className="text-[13px] font-medium text-[color:var(--color-night)]">
        {prompt.isFree ? 'Gratuit' : 'Premium'}
      </span>
      <span>
        <StatusBadge status={prompt.status} />
      </span>
      <PromptRowActions
        promptId={prompt.id}
        free={prompt.isFree}
        pinned={prompt.isPinned}
        status={prompt.status}
      />
    </div>
  );
}

/** Mobile : une carte sobre. */
function CarteMobile({ prompt }: { prompt: AdminPromptRow }) {
  return (
    <div className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-2.5">
      <div className="flex items-start gap-3">
        {/* L'apercu ouvre la fiche comme le texte : viser l'image est le
            geste naturel quand c'est elle qu'on a reconnue. */}
        <Link
          href={`/admin/raccourcis/${prompt.id}`}
          aria-hidden="true"
          tabIndex={-1}
          className="shrink-0"
        >
          <Apercu url={prompt.afterUrl} mode={prompt.mode} />
        </Link>

        <Link
          href={`/admin/raccourcis/${prompt.id}`}
          className="flex min-w-0 flex-1 flex-col gap-0.5"
        >
          <span className="flex items-start justify-between gap-2">
            <span className="line-clamp-2 text-[15px] font-semibold leading-[1.3] text-[color:var(--color-night)]">
              {prompt.name}
            </span>
            <StatusBadge status={prompt.status} />
          </span>

          {/* La commande, et ce qui distingue cette carte des autres qui la
              partagent. Depuis la V2, une liste peut contenir cinq lignes
              commencant par /vintageportrait : sans le nom de carte, on ne
              sait pas laquelle on ouvre. */}
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="commande truncate text-[13px] text-[color:var(--color-brand)]">
              {prompt.command}
            </span>
            {prompt.cardSlug ? (
              <span className="truncate text-[12px] text-[color:var(--color-muted)]">
                · {prompt.cardSlug}
              </span>
            ) : null}
          </span>

          <span className="truncate text-[12px] text-[color:var(--color-muted)]">
            {prompt.library ? LIBRARY_LABELS[prompt.library] : MODE_LABELS[prompt.mode]}
            {prompt.categoryName ? ` · ${prompt.categoryName}` : ' · sans collection'}
          </span>
        </Link>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 pl-[76px]">
        {/* L'apercu dit deja si le resultat est la ; la pastille reste pour
            ce qu'il ne montre pas — l'image de depart d'une comparaison. */}
        <MediaBadge
          avant={prompt.hasBefore}
          apres={prompt.hasAfter}
          compare={prompt.mode === 'image'}
        />

        <PromptRowActions
          promptId={prompt.id}
          free={prompt.isFree}
          pinned={prompt.isPinned}
          status={prompt.status}
        />
      </div>
    </div>
  );
}

/**
 * L'apercu du resultat, ou un cadre qui dit ce qui manque.
 *
 * Le cadre vide n'est pas un decor : c'est la liste des raccourcis qui
 * attendent un visuel, lisible en faisant defiler, sans filtre a poser.
 */
function Apercu({ url, mode }: { url: string | null; mode: AdminPromptRow['mode'] }) {
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={64}
        height={64}
        sizes="64px"
        className="h-16 w-16 rounded-[10px] object-cover"
      />
    );
  }

  return (
    <span className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[color:var(--color-line-strong)] bg-[color:var(--color-canvas)] text-[color:var(--color-muted)]">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.6"
          opacity="0.7"
        />
        <circle cx="8.5" cy="10" r="1.4" fill="currentColor" opacity="0.7" />
        <path
          d="m4.5 17 4.6-4.3 3.4 3.1 3-2.6 4 3.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
      </svg>
      <span className="text-[10px] font-medium leading-none">
        {mode === 'image' ? 'à venir' : 'texte'}
      </span>
    </span>
  );
}
