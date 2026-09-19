import Link from 'next/link';
import { notFound } from 'next/navigation';

import { categoriesDeRangement, getAdminPrompt, listAdminCategories } from '@/lib/admin/queries';
import { StatusBadge } from '@/components/ui/status-badge';
import { PromptIdentityForm } from '@/app/admin/raccourcis/[id]/identity-form';
import { PromptVersionForms } from '@/app/admin/raccourcis/[id]/version-forms';
import { PromptMediaManager } from '@/app/admin/raccourcis/[id]/media-manager';
import { PromptPublishControls } from '@/app/admin/raccourcis/[id]/publish-controls';
import { PromptPreview } from '@/app/admin/raccourcis/[id]/preview';
import { PromptTagsForm } from '@/app/admin/raccourcis/[id]/tags-form';
import { PromptChampsForm } from '@/app/admin/raccourcis/[id]/champs-form';
import { SuppressionDeCommande } from '@/app/admin/raccourcis/[id]/suppression';
import { listAdminTags } from '@/lib/admin/tags';
import { apercuDeSuppressionDeCommande } from '@/lib/admin/suppression';

export const metadata = { title: 'Modifier un raccourci' };

/**
 * Fiche d'edition, organisee comme le formulaire decrit par la spec :
 * identite, contenu par IA, medias, apercu, publication.
 */
export default async function AdminPromptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [prompt, categories, tags] = await Promise.all([
    getAdminPrompt(id),
    listAdminCategories(),
    listAdminTags(),
  ]);
  if (!prompt) notFound();

  // Le bilan de suppression est lu ici, au serveur : il compte sept
  // relations, et le demander au moment du clic ferait attendre devant un
  // bouton dont on vient de decider qu'il est dangereux.
  const bilan = await apercuDeSuppressionDeCommande(prompt.id);

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

      <Section title="Identité">
        <PromptIdentityForm prompt={prompt} categories={categoriesDeRangement(categories)} />
      </Section>

      <Section
        title="Contenu complet par IA"
        hint="Enregistrer créé une nouvelle version. La précédente est conservée, jamais écrasée."
      >
        <PromptVersionForms promptId={prompt.id} variants={prompt.variants} />
      </Section>

      <Section
        title="Visuels"
        hint="Ce que l’écran propose dépend du genre : une comparaison pour une commande image, une vignette pour un parcours, rien pour un mode."
      >
        <PromptMediaManager
          promptId={prompt.id}
          command={prompt.command}
          media={prompt.media}
          requiresPair={prompt.showImageCard}
          entityType={prompt.entityType}
        />
      </Section>

      <Section
        title="Tags"
        hint="C’est par eux que la Bibliothèque s’explore. Un tag que personne ne pose n’y apparaît pas."
      >
        <PromptTagsForm promptId={prompt.id} tags={tags} poses={prompt.tagIds} />
      </Section>

      <Section
        title="Champs à remplir"
        hint="Trois au plus. Ce que le membre saisit entre dans le texte copié, comme une donnée — jamais comme une consigne."
      >
        <PromptChampsForm promptId={prompt.id} champs={prompt.champs} />
      </Section>

      {/* La suppression ferme la page, loin des gestes courants et separee
          d'eux. Archiver est juste au-dessus, en tete : c'est le geste qui
          se defait. */}
      <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-danger)] bg-[color:var(--color-surface)] p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-danger)]">
          Zone de suppression
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--color-muted)]">
          Archiver masque la commande et se défait. Supprimer ne se défait pas.
        </p>
        <div className="mt-3">
          {bilan ? (
            <SuppressionDeCommande promptId={prompt.id} command={prompt.command} bilan={bilan} />
          ) : (
            <p className="text-[13px] text-[color:var(--color-muted)]">
              Le bilan de suppression n’a pas pu être lu. Réessayez.
            </p>
          )}
        </div>
      </section>
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
