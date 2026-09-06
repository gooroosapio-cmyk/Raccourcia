import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAdminPrompt, listAdminCategories } from '@/lib/admin/queries';
import { StatusBadge } from '@/components/ui/status-badge';
import { PromptIdentityForm } from '@/app/admin/raccourcis/[id]/identity-form';
import { PromptVersionForms } from '@/app/admin/raccourcis/[id]/version-forms';
import { PromptMediaManager } from '@/app/admin/raccourcis/[id]/media-manager';
import { PromptPublishControls } from '@/app/admin/raccourcis/[id]/publish-controls';
import { PromptPreview } from '@/app/admin/raccourcis/[id]/preview';

export const metadata = { title: 'Modifier un raccourci' };

/**
 * Fiche d'edition, organisee comme le formulaire decrit par la spec :
 * identite, contenu par IA, medias, apercu, publication.
 */
export default async function AdminPromptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [prompt, categories] = await Promise.all([getAdminPrompt(id), listAdminCategories()]);
  if (!prompt) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/raccourcis"
          className="text-[13px] font-medium text-[color:var(--color-brand)]"
        >
          &larr; Tous les raccourcis
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-mono text-xl font-semibold text-[color:var(--color-night)]">
              {prompt.command}
            </h1>
            <p className="truncate text-[13px] text-[color:var(--color-muted)]">{prompt.name}</p>
          </div>
          <StatusBadge status={prompt.status} />
        </div>
      </div>

      <PromptPublishControls promptId={prompt.id} status={prompt.status} slug={prompt.slug} />

      <PromptPreview prompt={prompt} />

      <Section title="Identite">
        <PromptIdentityForm prompt={prompt} categories={categories} />
      </Section>

      <Section
        title="Prompt complet par IA"
        hint="Enregistrer créé une nouvelle version. La précédente est conservée, jamais écrasée."
      >
        <PromptVersionForms promptId={prompt.id} variants={prompt.variants} />
      </Section>

      <Section title="Visuels" hint="Miniature pour la carte, avant et après pour montrer l’effet.">
        <PromptMediaManager
          promptId={prompt.id}
          command={prompt.command}
          media={prompt.media}
          requiresPair={prompt.showImageCard}
        />
      </Section>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
      <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
        {title}
      </h2>
      {hint ? (
        <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--color-muted)]">{hint}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}
