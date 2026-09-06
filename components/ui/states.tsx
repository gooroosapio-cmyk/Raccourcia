import Link from 'next/link';

/**
 * Etats systeme partages : chargement, resultat vide, incident.
 *
 * Aucun de ces ecrans n'est une impasse. Chacun propose une sortie, parce
 * qu'un utilisateur bloque devant un message ferme quitte l'application.
 */

/** Squelette d'une carte, aux dimensions de la carte reelle. */
export function SkeletonCard({ withMedia = true }: { withMedia?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="anim-squelette overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]"
    >
      {/* Les dimensions sont celles de la carte finale : le contenu ne saute
          pas quand il arrive. */}
      {withMedia ? <div className="aspect-[16/10] w-full bg-[color:var(--color-canvas)]" /> : null}
      <div className="space-y-2 p-4">
        <div className="h-5 w-2/5 rounded bg-[color:var(--color-canvas)]" />
        <div className="h-4 w-4/5 rounded bg-[color:var(--color-canvas)]" />
        <div className="h-11 w-full rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)]" />
      </div>
    </div>
  );
}

/** Liste de squelettes, pendant le chargement d'une page de catalogue. */
export function SkeletonList({
  count = 3,
  withMedia = true,
}: {
  count?: number;
  withMedia?: boolean;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} withMedia={withMedia} />
      ))}
    </div>
  );
}

/**
 * Ecran vide. Le titre dit ce qui manque, l'action dit quoi faire ensuite.
 */
export function EmptyState({
  title,
  body,
  actionLabel,
  actionHref,
  onAction,
  icon,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-5 py-10 text-center">
      {icon ? <div className="mb-3 flex justify-center">{icon}</div> : null}
      <p className="text-[17px] font-semibold text-[color:var(--color-night)]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[34ch] text-[14px] leading-relaxed text-[color:var(--color-muted)]">
        {body}
      </p>

      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex h-12 items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-5 text-[15px] font-semibold text-white"
        >
          {actionLabel}
        </Link>
      ) : null}

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex h-12 items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-5 text-[15px] font-semibold text-white"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
