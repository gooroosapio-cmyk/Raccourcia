import { listAdminCategories } from '@/lib/admin/queries';
import { CategoryCreateForm, CategoryRow } from '@/app/admin/categories/category-forms';
import { MODES, MODE_LABELS } from '@/lib/constants';

export const metadata = { title: 'Catégories' };

/**
 * Categories, groupees par mode et par hierarchie.
 *
 * Désactiver une categorie est l'action la plus lourde de consequences du
 * back-office : elle est donc toujours accompagnee du nombre de raccourcis
 * concernes et du rappel que rien n'est supprime.
 *
 * Chaque refonte de taxonomie laisse derriere elle des rayons archives et
 * vides — la V6 en a laisse une douzaine pour le seul domaine image. Les
 * garder en tete de liste noyait les trois familles vivantes sous les
 * anciennes. Ils sont donc replies en bas de page : toujours la, toujours
 * reactivables, mais hors du chemin de l'edition courante.
 */
export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();
  // Une categorie archivee qui porte encore un raccourci reste en pleine vue :
  // c'est elle qu'il faut voir pour comprendre ou est passe ce raccourci.
  const retirees = categories.filter(
    (category) => category.status === 'archived' && category.promptCount === 0,
  );
  const courantes = categories.filter((category) => !retirees.includes(category));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Catégories</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          Désactiver une catégorie masque ses raccourcis et ses sous-catégories cote membre. Les
          données restent intactes et reapparaissent des la reactivation.
        </p>
      </div>

      {MODES.map((mode) => {
        const parents = courantes.filter(
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
                ...courantes
                  .filter((child) => child.parentId === parent.id)
                  .map((child) => (
                    <CategoryRow key={child.id} category={child} categories={categories} isChild />
                  )),
              ])}
            </ul>
          </section>
        );
      })}

      {retirees.length > 0 ? (
        <details className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
          <summary className="min-h-11 cursor-pointer list-none text-[13px] font-medium text-[color:var(--color-night)]">
            Anciennes catégories ({retirees.length})
          </summary>
          <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--color-muted)]">
            Désactivées et vides, laissées par les refontes successives. Rien n’est supprimé : les
            réactiver les remet dans la liste, et elles gardent le rangement d’origine des
            raccourcis qu’elles portaient.
          </p>
          <ul className="mt-3 space-y-2">
            {retirees.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                categories={categories}
                isChild={false}
              />
            ))}
          </ul>
        </details>
      ) : null}

      <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
          Nouvelle catégorie
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--color-muted)]">
          Elle est créée désactivée : activez-la quand elle contient des raccourcis.
        </p>
        <div className="mt-3">
          <CategoryCreateForm categories={courantes} />
        </div>
      </section>
    </div>
  );
}
