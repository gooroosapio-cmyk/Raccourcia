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
import { EditeurEnOnglets } from '@/components/admin/editeur-en-onglets';

export const metadata = { title: 'Modifier un raccourci' };

/**
 * L'editeur d'une commande, en quatre sections (rapport de refonte, p. 11) :
 * Contenu, Prompt et champs, Medias, Publication. Un seul editeur de
 * payload ; l'apercu de la fiche reste visible sur ordinateur.
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
          &larr; Catalogue
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

      {/* Ordinateur : l'editeur a gauche, l'apercu de la fiche a droite,
          toujours visible. Mobile : l'apercu vit dans l'onglet Publication. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
        <EditeurEnOnglets
          onglets={[
            {
              cle: 'contenu',
              libelle: 'Contenu',
              contenu: (
                <>
                  <Section title="Identité">
                    <PromptIdentityForm
                      prompt={prompt}
                      categories={categoriesDeRangement(categories)}
                    />
                  </Section>
                  <Section
                    title="Tags"
                    hint="De un à quatre, dans le référentiel. C’est par eux que la Bibliothèque s’explore."
                  >
                    <PromptTagsForm promptId={prompt.id} tags={tags} poses={prompt.tagIds} />
                  </Section>
                </>
              ),
            },
            {
              cle: 'prompt',
              libelle: 'Prompt et champs',
              contenu: (
                <>
                  <Section
                    title="Prompt unique"
                    hint="Un seul texte, copié tel quel quelle que soit l’IA du membre. Enregistrer crée une nouvelle version ; la précédente est conservée."
                  >
                    <PromptVersionForms promptId={prompt.id} variants={prompt.variants} />
                  </Section>
                  <Section
                    title="Champs à remplir"
                    hint="Trois au plus (deux à quatre en marketing). Ce que le membre saisit entre dans le texte copié, comme une donnée — jamais comme une consigne."
                  >
                    <PromptChampsForm promptId={prompt.id} champs={prompt.champs} />
                  </Section>
                </>
              ),
            },
            {
              cle: 'medias',
              libelle: 'Médias',
              contenu: (
                <Section
                  title="Visuels"
                  hint="Un visuel n’est attendu que pour une commande Visuels affichée en carte illustrée ou dans Découvrir."
                >
                  <PromptMediaManager
                    promptId={prompt.id}
                    command={prompt.command}
                    media={prompt.media}
                    requiresPair={prompt.showImageCard}
                    entityType={prompt.entityType}
                  />
                </Section>
              ),
            },
            {
              cle: 'publication',
              libelle: 'Publication',
              contenu: (
                <>
                  <PromptPublishControls
                    promptId={prompt.id}
                    status={prompt.status}
                    slug={prompt.slug}
                  />
                  <div className="lg:hidden">
                    <PromptPreview prompt={prompt} />
                  </div>
                  {/* La suppression ferme la page, loin des gestes courants.
                      Archiver, au-dessus, est le geste qui se defait. */}
                  <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-danger)] bg-[color:var(--color-surface)] p-4">
                    <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-danger)]">
                      Zone de suppression
                    </h2>
                    <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--color-muted)]">
                      Archiver masque la commande et se défait. Supprimer ne se défait pas.
                    </p>
                    <div className="mt-3">
                      {bilan ? (
                        <SuppressionDeCommande
                          promptId={prompt.id}
                          command={prompt.command}
                          bilan={bilan}
                        />
                      ) : (
                        <p className="text-[13px] text-[color:var(--color-muted)]">
                          Le bilan de suppression n’a pas pu être lu. Réessayez.
                        </p>
                      )}
                    </div>
                  </section>
                </>
              ),
            },
          ]}
        />
        <aside className="hidden lg:sticky lg:top-20 lg:block">
          <PromptPreview prompt={prompt} />
        </aside>
      </div>
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
