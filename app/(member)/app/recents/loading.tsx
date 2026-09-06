import { SkeletonList } from '@/components/ui/states';

export default function Loading() {
  return (
    <div className="space-y-4 pt-1">
      <div className="anim-squelette h-7 w-32 rounded bg-[color:var(--color-surface)]" />
      <SkeletonList count={2} />
    </div>
  );
}
