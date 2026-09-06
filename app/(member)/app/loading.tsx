import { SkeletonList } from '@/components/ui/states';

/**
 * Chargement du catalogue.
 *
 * Les squelettes ont les dimensions des vraies cartes : le contenu ne saute
 * pas quand il arrive, et la page ne clignote pas entre vide et pleine.
 */
export default function Loading() {
  return (
    <div className="space-y-4 pt-1">
      <div className="anim-squelette space-y-3">
        <div className="flex gap-2">
          <div className="h-13 flex-1 rounded-[color:var(--radius-control)] bg-[color:var(--color-surface)]" />
          <div className="h-13 w-13 rounded-[color:var(--radius-control)] bg-[color:var(--color-surface)]" />
        </div>
        <div className="h-13 rounded-[color:var(--radius-control)] bg-[color:var(--color-sky)]" />
        <div className="flex gap-2">
          <div className="h-10 w-20 rounded-full bg-[color:var(--color-sky)]" />
          <div className="h-10 w-32 rounded-full bg-[color:var(--color-sky)]" />
          <div className="h-10 w-24 rounded-full bg-[color:var(--color-sky)]" />
        </div>
      </div>
      <SkeletonList count={3} />
    </div>
  );
}
