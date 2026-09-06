import Link from 'next/link';

import { listAdminPrompts } from '@/lib/admin/queries';
import { AdminPromptFilters } from '@/components/filters/admin-prompt-filters';
import { StatusBadge } from '@/components/ui/status-badge';
import { CONTENT_STATUS, MODES, MODE_LABELS, type Mode } from '@/lib/constants';
import type { Enums } from '@/lib/supabase/database.types';

export const metadata = { title: 'Raccourcis' };

export default async function AdminPromptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const asString = (value: string | string[] | undefined) =>
    typeof value === 'string' && value ? value : undefined;

  const mode = asString(params.mode);
  const status = asString(params.statut);

  const filters = {
    search: asString(params.q),
    mode: MODES.includes(mode as Mode) ? (mode as Mode) : undefined,
    status: CONTENT_STATUS.includes(status as Enums<'content_status'>)
      ? (status as Enums<'content_status'>)
      : undefined,
    page: Number(asString(params.page) ?? 1) || 1,
  };

  const { items, hasMore } = await listAdminPrompts(filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Raccourcis</h1>
        <Link
          href="/admin/raccourcis/nouveau"
          className="touch-target inline-flex items-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-3 text-sm font-medium text-white"
        >
          Nouveau
        </Link>
      </div>

      <AdminPromptFilters search={filters.search} mode={filters.mode} status={filters.status} />

      {items.length === 0 ? (
        <p className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 text-center text-[15px] text-[color:var(--color-muted)]">
          Aucun raccourci ne correspond a ces filtres.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((prompt) => (
            <li key={prompt.id}>
              <Link
                href={`/admin/raccourcis/${prompt.id}`}
                className="flex items-center justify-between gap-3 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-[15px] font-semibold text-[color:var(--color-night)]">
                    {prompt.command}
                  </p>
                  <p className="truncate text-[13px] text-[color:var(--color-muted)]">
                    {prompt.name}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[color:var(--color-muted)]">
                    {MODE_LABELS[prompt.mode]}
                    {prompt.categoryName ? ` - ${prompt.categoryName}` : ' - sans catégorie'}
                  </p>
                </div>
                <StatusBadge status={prompt.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <Link
          href={`/admin/raccourcis?${new URLSearchParams({
            ...(filters.search ? { q: filters.search } : {}),
            ...(filters.mode ? { mode: filters.mode } : {}),
            ...(filters.status ? { statut: filters.status } : {}),
            page: String(filters.page + 1),
          })}`}
          className="flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-sm font-medium text-[color:var(--color-night)]"
        >
          Page suivante
        </Link>
      ) : null}
    </div>
  );
}
