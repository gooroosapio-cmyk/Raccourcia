'use client';

import { AILogo } from '@/components/brand/ai-logos';
import { AccessBadge } from '@/components/cards/access-badge';
import { CopyCommandButton } from '@/components/cards/copy-command-button';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { usePaywall } from '@/components/paywall/paywall-provider';
import type { PromptCard as PromptCardData } from '@/lib/catalog/types';

/**
 * Carte d'une commande texte, au meme gabarit que la carte image.
 *
 * Les deux familles cohabitent dans une seule grille : une carte plus courte
 * pour le texte creerait des trous en quinconce a chaque changement de mode.
 *
 * La zone haute — celle que la carte image donne au visuel — porte ici
 * l'intention : ce que la commande cherche a obtenir, en une ligne. Le corps
 * garde la description, qui dit comment elle s'y prend. Les deux se lisent
 * ensemble et ne se repetent pas : « Rendre visible la structure interne »
 * au-dessus, « Transforme un objet en vue transparente... » en dessous.
 *
 * Cette zone montrait d'abord quatre traits bleus imitant des lignes de
 * texte, puis des cas d'usage. Le decor n'apprenait rien; les cas d'usage
 * repetaient souvent la description avec d'autres mots. L'intention, elle,
 * dit autre chose. Et jamais une photographie d'illustration, qui
 * promettrait une image que la commande ne produit pas.
 */
export function TextPromptCard({
  prompt,
  provider,
  locked,
  free,
  masque = false,
  visiteur = false,
  onOpen,
}: {
  prompt: PromptCardData;
  provider: string;
  locked: boolean;
  free: boolean;
  /**
   * Vrai pour un visiteur devant une commande verrouillee : le nom de la
   * commande disparait, seule sa description reste.
   */
  masque?: boolean;
  /** Vrai quand personne n'est connecte : le favori n'a pas ou se ranger. */
  visiteur?: boolean;
  onOpen: (prompt: PromptCardData) => void;
}) {
  const { open: ouvrirOffre } = usePaywall();
  const compatibles = prompt.providers.filter((entry) => entry.compatibility !== 'non_supporte');
  const actif = compatibles.find((entry) => entry.key === provider) ?? compatibles[0];
  const description = prompt.shortDescription || prompt.resultSummary;
  const intention = prompt.intention?.trim() ?? '';
  // Repli quand l'intention manque : les cas d'usage tiennent la zone plutot
  // que de la laisser vide.
  const usages = prompt.useCases.slice(0, 3);

  return (
    <article className="anim-apparition relative flex flex-col overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => onOpen(prompt)}
        className="flex flex-1 flex-col text-left"
      >
        <span className="relative flex aspect-[4/3] w-full flex-col justify-center gap-1 overflow-hidden bg-gradient-to-br from-[color:var(--color-sky)] to-[color:var(--color-canvas)] px-2.5 py-2">
          {intention ? (
            <>
              <span className="text-[length:var(--texte-meta)] font-semibold uppercase tracking-wide text-[color:var(--color-brand)]/70">
                Intention
              </span>
              <span className="line-clamp-4 text-[length:var(--texte-carte)] leading-[1.35] text-[color:var(--color-night)]/85">
                {intention}
              </span>
            </>
          ) : usages.length > 0 ? (
            <>
              <span className="text-[length:var(--texte-meta)] font-semibold uppercase tracking-wide text-[color:var(--color-brand)]/70">
                Cas d’usage
              </span>
              {usages.map((usage) => (
                <span
                  key={usage}
                  className="flex items-start gap-1 text-[length:var(--texte-meta)] leading-[1.3] text-[color:var(--color-night)]/80"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.45em] block h-1 w-1 shrink-0 rounded-full bg-[color:var(--color-brand)]/50"
                  />
                  <span className="line-clamp-1">{usage}</span>
                </span>
              ))}
            </>
          ) : (
            <span className="line-clamp-3 text-[length:var(--texte-meta)] italic leading-[1.35] text-[color:var(--color-muted)]">
              {description}
            </span>
          )}
        </span>

        <span className="flex flex-1 flex-col gap-1 px-2.5 pb-2 pt-2">
          {masque ? null : (
            <span className="commande truncate text-[length:var(--texte-commande-carte)] font-bold text-[color:var(--color-brand)]">
              {prompt.command}
            </span>
          )}

          {/* Comment le raccourci s'y prend, sous ce qu'il cherche a obtenir.
              Jamais `result_summary` en premier : il se repete a l'identique
              sur toute une famille. */}
          <span
            className={`text-[length:var(--texte-carte)] leading-[1.35] text-[color:var(--color-night)] ${
              masque ? 'line-clamp-3' : 'line-clamp-2'
            }`}
          >
            {description}
          </span>

          {compatibles.length > 0 ? (
            <span className="mt-auto flex items-center gap-1 pt-1">
              {compatibles.slice(0, 3).map((entry) => (
                <AILogo key={entry.key} providerKey={entry.key} name={entry.name} taille={15} />
              ))}
            </span>
          ) : null}
        </span>
      </button>

      <span className="pointer-events-none absolute left-1.5 top-1.5">
        <AccessBadge free={free} locked={locked} isNew={prompt.isNew} />
      </span>

      <div className="absolute right-0.5 top-0.5">
        <FavoriteButton
          promptId={prompt.id}
          initial={prompt.isFavorite}
          disabled={locked || visiteur}
          sur
        />
      </div>

      <div className="border-t border-[color:var(--color-line)] p-2">
        <CopyCommandButton
          promptId={prompt.id}
          provider={actif?.key ?? 'chatgpt'}
          surface="carte"
          locked={locked}
          compact
          onLockedClick={ouvrirOffre}
        />
      </div>
    </article>
  );
}
