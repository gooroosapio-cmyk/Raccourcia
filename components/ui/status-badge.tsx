import type { Enums } from '@/lib/supabase/database.types';

/**
 * Statut editorial, en langage humain.
 * L'interface ne dit jamais "draft" ou "archived" (Doc Technique V1, 13.2).
 */
const LABELS: Record<Enums<'content_status'>, { text: string; className: string }> = {
  published: { text: 'Publie', className: 'bg-[#E9F7EF] text-[color:var(--color-success)]' },
  draft: { text: 'Brouillon', className: 'bg-[#FFF3E0] text-[color:var(--color-warning)]' },
  archived: {
    text: 'Archive',
    className: 'bg-[color:var(--color-canvas)] text-[color:var(--color-muted)]',
  },
};

export function StatusBadge({ status }: { status: Enums<'content_status'> }) {
  const { text, className } = LABELS[status];
  return (
    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${className}`}>
      {text}
    </span>
  );
}
