import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPromptDetail, getPublicConfig } from '@/lib/catalog/queries';
import { getAccessState } from '@/lib/access/entitlement';
import { AccessBadge } from '@/components/cards/access-badge';
import { BeforeAfterMedia, MediaPlaceholder } from '@/components/media/before-after-media';
import { CompatibilityList } from '@/components/detail/compatibility-list';
import { InputExampleList } from '@/components/detail/input-example-list';
import { OutputFormatList } from '@/components/detail/output-format-list';
import { NetworkError } from '@/components/ui/network-error';
import { isCatalogUnavailable } from '@/lib/catalog/errors';

/**
 * Page publique partageable d'une commande.
 *
 * Elle montre la valeur : la commande, ce qu'elle produit, la comparaison
 * avant/apres, les entrees acceptees, les IA compatibles. Le contenu complet
 * en est totalement absent : ni dans le HTML, ni dans les donnees de page, ni
 * dans les metadonnees SEO (Doc Technique V1, 10.1). Le verrou n'apparait
 * qu'apres la demonstration.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Les metadonnees ne doivent jamais faire echouer la page : en cas
  // d'incident, on retombe sur un titre neutre et le rendu prend le relais.
  const prompt = await getPromptDetail(slug).catch(() => null);
  if (!prompt) return { title: 'Commande' };

  return {
    title: `${prompt.command} - ${prompt.name}`,
    description: prompt.resultSummary,
    openGraph: {
      title: `${prompt.command} - ${prompt.name}`,
      description: prompt.resultSummary,
      images: prompt.beforeAfter ? [prompt.beforeAfter.afterUrl] : undefined,
    },
  };
}

export default async function PublicPromptPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { publicCatalogEnabled } = await getPublicConfig();
  if (!publicCatalogEnabled) notFound();

  // Un incident de base ne doit pas se presenter comme une commande
  // inexistante : on separe explicitement les deux cas.
  let prompt;
  try {
    prompt = await getPromptDetail(slug);
  } catch (error) {
    if (isCatalogUnavailable(error)) {
      return (
        <div className="pt-6">
          <NetworkError />
        </div>
      );
    }
    throw error;
  }

  if (!prompt) notFound();

  const { hasLifetimeAccess } = await getAccessState();
  const compatibles = prompt.providers.filter((entry) => entry.compatibility !== 'non_supporte');

  return (
    <article className="pt-2">
      {prompt.showImageCard ? (
        <div className="mb-5">
          {prompt.beforeAfter ? (
            <BeforeAfterMedia media={prompt.beforeAfter} command={prompt.command} priority />
          ) : (
            <MediaPlaceholder command={prompt.command} />
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <h1 className="commande truncate text-[26px] font-semibold text-[color:var(--color-brand)]">
          {prompt.command}
        </h1>
        <AccessBadge free={prompt.isFree} locked={false} isNew={prompt.isNew} />
      </div>

      <p className="mt-2 text-[17px] leading-relaxed text-[color:var(--color-night)]">
        {prompt.resultSummary}
      </p>

      {prompt.useCases.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {prompt.useCases.slice(0, 3).map((cas) => (
            <li
              key={cas}
              className="flex gap-2 text-[14px] leading-relaxed text-[color:var(--color-muted)]"
            >
              <span
                aria-hidden="true"
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color:var(--color-brand)]"
              />
              <span>{cas}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {prompt.inputExamples.length > 0 ? (
        <Section titre="Exemples d’entrées">
          <InputExampleList inputs={prompt.inputExamples} />
        </Section>
      ) : null}

      {prompt.outputFormats.length > 0 ? (
        <Section titre="Résultat">
          <OutputFormatList formats={prompt.outputFormats} />
        </Section>
      ) : null}

      {compatibles.length > 0 ? (
        <Section titre="Compatible avec">
          <CompatibilityList providers={compatibles} />
        </Section>
      ) : null}

      <section className="mt-8 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        {hasLifetimeAccess ? (
          <>
            <p className="text-[15px] font-semibold text-[color:var(--color-night)]">
              Votre accès est actif.
            </p>
            <Link
              href={`/app?q=${encodeURIComponent(prompt.command)}`}
              className="mt-3 flex h-13 items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] text-[15px] font-semibold text-white"
            >
              Ouvrir dans la bibliothèque
            </Link>
          </>
        ) : (
          <>
            <p className="text-[15px] font-semibold text-[color:var(--color-night)]">
              Cette commande est réservée aux membres.
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
              Accès à vie, paiement unique, toutes les commandes incluses.
            </p>
            <Link
              href="/offre"
              className="mt-3 flex h-13 items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] text-[15px] font-semibold text-white"
            >
              Voir l’offre
            </Link>
          </>
        )}
      </section>

      {prompt.categoryName ? (
        <p className="mt-6 text-[13px] text-[color:var(--color-muted)]">
          Catégorie : {prompt.categoryName}
        </p>
      ) : null}
    </article>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
        {titre}
      </h2>
      {children}
    </section>
  );
}
