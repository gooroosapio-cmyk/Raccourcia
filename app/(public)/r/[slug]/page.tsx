import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getAliasDestination, getPromptDetail, getPublicConfig } from '@/lib/catalog/queries';
import { getAccessState } from '@/lib/access/entitlement';
import { AccessBadge } from '@/components/cards/access-badge';
import { AvertissementResultats } from '@/components/detail/avertissement-resultats';
import { BlocDeCopie } from '@/components/detail/bloc-de-copie';
import { BeforeAfterMedia, MediaPlaceholder } from '@/components/media/before-after-media';
import { CorpsMode, CorpsParcours } from '@/components/detail/fiche-moteur';
import { GenreDeFiche } from '@/components/detail/genre-fiche';
import { InputExampleList } from '@/components/detail/input-example-list';
import { MotsCles } from '@/components/detail/mots-cles';
import { ModesCommande } from '@/components/detail/modes-commande';
import { Section } from '@/components/detail/section-fiche';
import { NiveauExecution } from '@/components/detail/niveau-execution';
import { OutputFormatList } from '@/components/detail/output-format-list';
import { NetworkError } from '@/components/ui/network-error';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
import { decrireNiveau } from '@/lib/catalog/niveau';
import { texteDePartage } from '@/lib/share/texte-de-partage';

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
  if (!prompt) {
    // Une ancienne adresse redirige : le titre neutre ne serait vu que le
    // temps de la redirection, mais un apercu de partage, lui, s'y arrete.
    const destination = await getAliasDestination(slug).catch(() => null);
    if (destination) {
      const cible = await getPromptDetail(destination.slug).catch(() => null);
      if (cible) return { title: `${cible.name} - ${cible.command}` };
    }
    return { title: 'Commande' };
  }

  return {
    title: `${prompt.name} - ${prompt.command}`,
    // La description de page reste celle du catalogue : c'est elle que les
    // moteurs de recherche indexent, et un moteur veut une phrase qui
    // decrit, pas une phrase qui s'adresse a quelqu'un.
    description: prompt.resultSummary,
    openGraph: {
      title: prompt.name,
      // L'apercu de partage, lui, s'adresse a une personne : c'est le
      // meme texte que le bouton Partager met dans le message.
      description: texteDePartage(prompt),
      // Aucune image nommee ici : `opengraph-image.tsx` en fabrique une,
      // avec le logo incruste. La declarer en plus la remplacerait par la
      // photo nue, qui ne dit pas d'ou elle vient.
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

  if (!prompt) {
    // Cette adresse a peut-etre ete partagee avant que le raccourci ne
    // devienne un mode d'une commande plus large. Le lien doit conduire la
    // ou le travail se fait, pas s'excuser. Redirection permanente : c'est
    // bien un changement d'adresse definitif, et les moteurs de recherche
    // reportent alors ce que l'ancienne page avait gagne.
    const destination = await getAliasDestination(slug);
    if (destination) permanentRedirect(`/r/${destination.slug}`);
    notFound();
  }

  const { hasFullAccess } = await getAccessState();
  const compatibles = prompt.providers.filter((entry) => entry.compatibility !== 'non_supporte');
  const niveau = decrireNiveau(prompt.level, prompt.maxQuestions);

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

      {/* Le titre d'abord, le raccourci ensuite, comme sur la fiche en
          bibliotheque : cette page est celle qu'on partage, et un lien qui
          s'annonce « /seoaudit » ne dit rien a qui le recoit. */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <GenreDeFiche entityType={prompt.entityType} />
          <h1 className="text-[26px] font-semibold leading-tight text-[color:var(--color-night)]">
            {prompt.name}
          </h1>
          <p className="commande truncate text-[length:var(--texte-corps)] font-semibold text-[color:var(--color-brand)]">
            {prompt.command}
          </p>
        </div>
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

      {/* La meme annonce que dans la fiche de l'application : quelqu'un qui
          arrive par un lien partage doit savoir, lui aussi, si la commande
          rend un resultat tout de suite ou conduit un travail. */}
      {niveau ? (
        <div className="mt-5">
          <NiveauExecution niveau={niveau} />
        </div>
      ) : null}

      {/* Le meme corps de fiche que dans l'application, et pour la meme
          raison : un lien partage vers un Parcours n'annoncait ni le nombre
          de livrables ni l'ordre dans lequel ils arrivent, alors que c'est
          tout ce qu'il y avait a montrer. Les titres montent d'un rang — ici
          la commande tient le `h1` de la page, la ou la fiche est une
          couche posee sur une page qui a deja le sien. */}
      {prompt.entityType === 'mode_ia' ? (
        <CorpsMode prompt={prompt} niveau={2} />
      ) : prompt.entityType === 'parcours' ? (
        <CorpsParcours prompt={prompt} niveau={2} />
      ) : (
        <>
          {prompt.inputExamples.length > 0 ? (
            <Section titre="Exemples d’entrées" niveau={2}>
              <InputExampleList inputs={prompt.inputExamples} />
            </Section>
          ) : null}

          {prompt.outputFormats.length > 0 ? (
            <Section titre="Résultat" niveau={2}>
              <OutputFormatList formats={prompt.outputFormats} />
            </Section>
          ) : null}
        </>
      )}

      {prompt.modes.length > 0 ? (
        <Section titre="Elle sait aussi faire" niveau={2}>
          <ModesCommande modes={prompt.modes} />
        </Section>
      ) : null}

      {/* La sortie de la page : quelqu'un qui ouvre ce lien depuis une
          conversation cherche souvent « quelque chose de ce genre » plutot
          que cette commande precise. */}
      <MotsCles mots={prompt.motsCles} />

      <section className="mt-8 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        {prompt.isFree ? (
          /*
           * Commande offerte : elle se copie ici, sans compte.
           *
           * C'est le seul endroit ou un lien partage sur WhatsApp demontre
           * quelque chose. Renvoyer vers l'offre celui qui vient d'ouvrir le
           * lien d'une commande gratuite lui fermait la porte au moment
           * precis ou on lui montrait ce qu'il y a derriere.
           */
          <>
            {/* L'IA se choisit ici, pas ailleurs : chaque commande porte un
                texte different par IA, et quelqu'un qui ouvre ce lien depuis
                une conversation n'utilise pas forcement la premiere de la
                liste. Lui servir le texte d'une autre etait une erreur
                silencieuse — la commande marchait moins bien, sans qu'il
                puisse savoir pourquoi. */}
            <BlocDeCopie
              prompt={prompt}
              providers={compatibles}
              surface="page-publique"
              proposerOuverture
            />
            {!hasFullAccess ? (
              <p className="mt-3 text-center text-[13px] leading-relaxed text-[color:var(--color-muted)]">
                Cette commande est offerte.{' '}
                <Link href="/offre" className="font-medium text-[color:var(--color-brand)]">
                  Voir tout le catalogue
                </Link>
              </p>
            ) : null}
          </>
        ) : hasFullAccess ? (
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

      <AvertissementResultats className="mt-4 border-t border-[color:var(--color-line)] pt-3" />
    </article>
  );
}
