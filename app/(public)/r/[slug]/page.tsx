import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPromptDetail, getPublicConfig } from '@/lib/catalog/queries';
import { getAccessState } from '@/lib/access/entitlement';
import { Badge } from '@/components/ui/badge';
import { NetworkError } from '@/components/ui/network-error';
import { isCatalogUnavailable } from '@/lib/catalog/errors';

/**
 * Page publique partageable d'un raccourci.
 *
 * Elle montre la valeur : commande, promesse, cas d'usage, visuels, IA
 * compatibles. Le prompt complet en est totalement absent : ni dans le HTML,
 * ni dans les donnees de page, ni dans les metadonnees SEO
 * (Doc Technique V1, 10.1). Le verrou n'apparait qu'apres la demonstration.
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
  if (!prompt) return { title: 'Raccourci' };

  return {
    title: `${prompt.command} - ${prompt.name}`,
    description: prompt.shortDescription,
    openGraph: {
      title: `${prompt.command} - ${prompt.name}`,
      description: prompt.shortDescription,
      images: prompt.thumbnailUrl ? [prompt.thumbnailUrl] : undefined,
    },
  };
}

export default async function PublicPromptPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { publicCatalogEnabled } = await getPublicConfig();
  if (!publicCatalogEnabled) notFound();

  // Un incident de base ne doit pas se presenter comme un raccourci
  // inexistant : on separe explicitement les deux cas.
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
  const compatible = prompt.providers.filter((entry) => entry.compatibility !== 'non_supporte');

  return (
    <article className="mx-auto max-w-md pt-4">
      {prompt.thumbnailUrl ? (
        <div className="relative mb-5 aspect-[4/3] w-full overflow-hidden rounded-[color:var(--radius-card)] bg-[color:var(--color-canvas)]">
          <Image
            src={prompt.thumbnailUrl}
            alt={prompt.thumbnailAlt ?? ''}
            fill
            sizes="(max-width: 640px) 100vw, 480px"
            priority
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <h1 className="font-mono text-2xl font-semibold text-[color:var(--color-night)]">
          {prompt.command}
        </h1>
        {prompt.isFree ? <Badge>Gratuit</Badge> : null}
      </div>
      <p className="mt-1 text-base font-medium text-[color:var(--color-ink)]">{prompt.name}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--color-muted)]">
        {prompt.shortDescription}
      </p>

      {compatible.length > 0 ? (
        <p className="mt-4 text-[13px] text-[color:var(--color-muted)]">
          Compatible : {compatible.map((entry) => entry.name).join(', ')}
        </p>
      ) : null}

      {prompt.useCases.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
            Quand l utiliser
          </h2>
          <ul className="mt-2 space-y-1.5">
            {prompt.useCases.slice(0, 3).map((useCase) => (
              <li key={useCase} className="flex gap-2 text-[15px] leading-relaxed">
                <span aria-hidden="true" className="text-[color:var(--color-brand)]">
                  -
                </span>
                <span>{useCase}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        {hasLifetimeAccess ? (
          <>
            <p className="text-[15px] font-medium text-[color:var(--color-night)]">
              Votre acces est actif.
            </p>
            <Link
              href={`/app?q=${encodeURIComponent(prompt.command)}`}
              className="mt-3 flex h-12 items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] font-medium text-white"
            >
              Ouvrir dans la bibliotheque
            </Link>
          </>
        ) : (
          <>
            <p className="text-[15px] font-medium text-[color:var(--color-night)]">
              Le prompt complet est reserve aux membres.
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
              Acces a vie, paiement unique, tous les raccourcis inclus.
            </p>
            <Link
              href="/activation"
              className="mt-3 flex h-12 items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] font-medium text-white"
            >
              Debloquer RaccourcIA
            </Link>
          </>
        )}
      </section>

      {prompt.categoryName ? (
        <p className="mt-6 text-[13px] text-[color:var(--color-muted)]">
          Categorie : {prompt.categoryName}
        </p>
      ) : null}
    </article>
  );
}
