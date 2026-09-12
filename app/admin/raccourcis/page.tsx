import Link from 'next/link';

import { listAdminCategories, listAdminPrompts } from '@/lib/admin/queries';
import type { AdminPromptFilters as FiltresListe } from '@/lib/admin/queries';
import { AdminPromptFilters } from '@/components/filters/admin-prompt-filters';
import { AdminPromptRowItem } from '@/components/admin/prompt-row';
import { CONTENT_STATUS, MODES, type Mode } from '@/lib/constants';
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
  const acces = asString(params.acces);
  const visuel = asString(params.visuel);

  // Le type contextuel garde les litteraux : sans lui, « gratuit » redevient
  // `string` dans l'objet et ne correspond plus a la liste fermee.
  const filters: FiltresListe = {
    search: asString(params.q),
    mode: MODES.includes(mode as Mode) ? (mode as Mode) : undefined,
    status: CONTENT_STATUS.includes(status as Enums<'content_status'>)
      ? (status as Enums<'content_status'>)
      : undefined,
    categoryId: asString(params.categorie),
    // Listes fermees : une valeur inconnue arrivant par l'URL est ignoree,
    // jamais transmise a la requete.
    access: acces === 'gratuit' || acces === 'premium' ? acces : undefined,
    media: visuel === 'avec' || visuel === 'sans' ? visuel : undefined,
    page: Number(asString(params.page) ?? 1) || 1,
  };

  const [{ items, hasMore }, categories] = await Promise.all([
    listAdminPrompts(filters),
    listAdminCategories(),
  ]);

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

      <AdminPromptFilters
        search={filters.search}
        mode={filters.mode}
        status={filters.status}
        categoryId={filters.categoryId}
        access={filters.access}
        media={filters.media}
        categories={categories}
      />

      {items.length === 0 ? (
        <p className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 text-center text-[15px] text-[color:var(--color-muted)]">
          Aucun raccourci ne correspond à ces filtres.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((prompt) => (
            <AdminPromptRowItem key={prompt.id} prompt={prompt} />
          ))}
        </ul>
      )}

      {hasMore ? (
        <Link
          href={`/admin/raccourcis?${new URLSearchParams({
            ...(filters.search ? { q: filters.search } : {}),
            ...(filters.mode ? { mode: filters.mode } : {}),
            ...(filters.status ? { statut: filters.status } : {}),
            ...(filters.categoryId ? { categorie: filters.categoryId } : {}),
            ...(filters.access ? { acces: filters.access } : {}),
            ...(filters.media ? { visuel: filters.media } : {}),
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
