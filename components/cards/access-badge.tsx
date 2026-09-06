import { Badge } from '@/components/ui/badge';

/**
 * Badge d'acces d'une carte.
 *
 * Un seul badge, dans cet ordre : "Gratuit" prime car c'est le seul qui
 * appelle une action immediate, "Membre" ensuite car il explique le verrou,
 * "Nouveau" en dernier car il n'est qu'informatif.
 */
export function AccessBadge({
  free,
  locked,
  isNew,
}: {
  free: boolean;
  locked: boolean;
  isNew: boolean;
}) {
  if (free) return <Badge tone="gratuit">Gratuit</Badge>;
  if (locked)
    return (
      <Badge tone="premium" icon={<LockIcon />}>
        Membre
      </Badge>
    );
  if (isNew) return <Badge tone="nouveau">Nouveau</Badge>;
  return null;
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
