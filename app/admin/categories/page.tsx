import { listAdminCategories } from '@/lib/admin/queries';
import { CategoryCreateForm, CategoryRow } from '@/app/admin/categories/category-forms';
import { MODES, MODE_LABELS } from '@/lib/constants';

export const metadata = { title: 'Categories' };

/**
 * Categories, groupees par mode et par hierarchie.
 *
 * Desactiver une categorie est l'action la plus lourde de consequences du
 * back-office : elle est donc toujours accompagnee du nombre de raccourcis
 * concernes et du rappel que rien n'est supprime.
 */
export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Categories</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          Desactiver une categorie masque ses raccourcis et ses sous-categories cote membre. Les
          donnees restent intactes et reapparaissent des la reactivation.
        </p>
      </div>

      {MODES.map((mode) => {
        const parents = categories.filter(
          (category) => category.mode === mode && category.parentId === null,
        );
        if (parents.length === 0) return null;

        return (
          <section key={mode} className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
              {MODE_LABELS[mode]}
            </h2>
            <ul className="space-y-2">
              {parents.flatMap((parent) => [
                <CategoryRow
                  key={parent.id}
                  category={parent}
                  categories={categories}
                  isChild={false}
                />,
                ...categories
                  .filter((child) => child.parentId === parent.id)
                  .map((child) => (
                    <CategoryRow key={child.id} category={child} categories={categories} isChild />
                  )),
              ])}
            </ul>
          </section>
        );
      })}

      <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
          Nouvelle categorie
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--color-muted)]">
          Elle est creee desactivee : activez-la quand elle contient des raccourcis.
        </p>
        <div className="mt-3">
          <CategoryCreateForm categories={categories} />
        </div>
      </section>
    </div>
  );
}
