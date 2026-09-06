import Link from 'next/link';

import { listAdminCategories } from '@/lib/admin/queries';
import { NewPromptForm } from '@/app/admin/raccourcis/nouveau/new-prompt-form';

export const metadata = { title: 'Nouveau raccourci' };

export default async function NewPromptPage() {
  const categories = await listAdminCategories();

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/raccourcis"
          className="text-[13px] font-medium text-[color:var(--color-brand)]"
        >
          &larr; Tous les raccourcis
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-[color:var(--color-night)]">
          Nouveau raccourci
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          Le raccourci est créé en brouillon. Vous ajoutez ensuite le prompt complet de chaque IA et
          les visuels, puis vous publiez.
        </p>
      </div>

      <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        <NewPromptForm categories={categories} />
      </section>
    </div>
  );
}
