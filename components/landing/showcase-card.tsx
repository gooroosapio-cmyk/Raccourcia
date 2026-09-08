import Image from 'next/image';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Carte de commande de la page de vente.
 *
 * Elle reprend la carte de la bibliotheque — visuel de resultat, nom, une
 * ligne de description, badge d'acces — mais ne copie rien : cette page
 * montre, elle ne distribue pas. Aucun bouton de copie, aucune fiche a
 * ouvrir : ce qui s'y trouve est une vitrine, et la vitrine renvoie au
 * magasin.
 *
 * Une commande reservee arrive ici deja privee de son nom, par la couche de
 * donnees. Le cadenas ne cache donc pas un texte present dans la page : il
 * n'y a rien a cacher, et c'est ce qui rend le verrou honnete.
 */
export function ShowcaseCard({
  prompt,
  priority = false,
}: {
  prompt: PromptCard;
  priority?: boolean;
}) {
  const verrouille = prompt.command === '';
  const description = prompt.shortDescription || prompt.resultSummary;

  return (
    <article className="group flex flex-col overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)] transition-shadow duration-[var(--duration-base)] hover:shadow-[var(--shadow-raised)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[color:var(--color-canvas)]">
        {prompt.thumbnailUrl ? (
          <Image
            src={prompt.thumbnailUrl}
            alt={prompt.thumbnailAlt ?? description}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 360px"
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            className={`object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.03] ${
              verrouille ? 'scale-[1.06] blur-[7px]' : ''
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[color:var(--color-sky)] to-[color:var(--color-canvas)] text-[length:var(--texte-meta)] font-medium text-[color:var(--color-brand)]/75">
            Visuel à venir
          </div>
        )}

        <span className="absolute left-2.5 top-2.5">
          {prompt.isFree ? (
            <span className="inline-flex items-center rounded-full bg-[color:var(--color-success-soft)] px-2.5 py-1 text-[length:var(--texte-meta)] font-semibold text-[color:var(--color-success)]">
              Gratuit
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-member-soft)] px-2.5 py-1 text-[length:var(--texte-meta)] font-semibold text-[color:var(--color-member)]">
              <CadenasIcone />
              Premium
            </span>
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {verrouille ? (
          <span className="text-[length:var(--texte-commande-carte)] font-semibold text-[color:var(--color-member)]">
            Commande réservée
          </span>
        ) : (
          <span className="commande truncate text-[length:var(--texte-commande-carte)] font-bold text-[color:var(--color-brand)]">
            {prompt.command}
          </span>
        )}
        <p className="line-clamp-2 text-[length:var(--texte-carte)] leading-[1.4] text-[color:var(--color-muted)]">
          {description}
        </p>
      </div>
    </article>
  );
}

function CadenasIcone() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="2.6" />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
