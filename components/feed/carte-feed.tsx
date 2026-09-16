'use client';

import { AccessBadge } from '@/components/cards/access-badge';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { ResultThumbnail } from '@/components/cards/result-thumbnail';
import { actionPrincipale, nomDuGenre, reperesDeCarte } from '@/lib/catalog/experience';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Une carte du feed : pleine largeur, un visuel qu'on regarde.
 *
 * La grille a deux colonnes sert a parcourir ; le feed sert a decouvrir. Ce
 * n'est pas la meme carte : ici le visuel occupe toute la largeur, la
 * description a de la place, et l'action est un vrai bouton plutot qu'une
 * barre au ras du bord.
 *
 * Le sur-titre dit d'ou vient la carte. Sans lui, un feed qui melange
 * volontairement les rayons donne l'impression d'un tirage au hasard.
 *
 * Les reperes — « 1 photo », « Format 4:5 » — remplacent les trois logos
 * d'IA qui s'affichaient sous chaque carte. Trois symboles sans libelle ne
 * repondaient a aucune question qu'on se pose avant de choisir ; ce qu'on
 * veut savoir, c'est ce qu'il faut fournir et ce qu'on obtient.
 *
 * Le feed ne contient jamais de carte sans visuel : c'est la requete qui
 * l'assure, pas ce composant. Il n'a donc pas de repli a dessiner.
 */
export function CarteFeed({
  prompt,
  locked,
  free,
  visiteur = false,
  priority,
  onOpen,
}: {
  prompt: PromptCard;
  locked: boolean;
  free: boolean;
  visiteur?: boolean;
  priority: boolean;
  onOpen: (prompt: PromptCard) => void;
}) {
  const genre = nomDuGenre(prompt);
  const reperes = reperesDeCarte(prompt);
  const surTitre = prompt.collectionName ?? genre;

  return (
    <article className="anim-apparition relative overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
      <button type="button" onClick={() => onOpen(prompt)} className="block w-full text-left">
        <span className="relative block w-full">
          <span className={`block ${locked ? 'scale-[1.04] blur-[7px]' : ''}`}>
            <ResultThumbnail
              url={prompt.thumbnailUrl}
              alt={prompt.thumbnailAlt}
              libelle={prompt.name}
              priority={priority}
            />
          </span>
        </span>

        <span className="flex flex-col gap-1 px-4 pb-3 pt-3">
          {surTitre ? (
            <span className="text-[length:var(--texte-meta)] font-semibold uppercase tracking-wide text-[color:var(--color-brand)]/75">
              {surTitre}
            </span>
          ) : null}

          <span className="text-[17px] font-bold leading-tight text-[color:var(--color-night)]">
            {prompt.name}
          </span>

          <span className="line-clamp-2 text-[length:var(--texte-corps)] leading-relaxed text-[color:var(--color-muted)]">
            {prompt.shortDescription || prompt.resultSummary}
          </span>

          {reperes.length > 0 ? (
            <span className="mt-1 flex flex-wrap gap-1.5">
              {reperes.map((repere) => (
                <span
                  key={repere}
                  className="rounded-full bg-[color:var(--color-sky)] px-2.5 py-1 text-[length:var(--texte-meta)] font-medium text-[color:var(--color-night)]/75"
                >
                  {repere}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </button>

      <span className="pointer-events-none absolute left-2 top-2">
        <AccessBadge free={free} locked={locked} isNew={prompt.isNew} />
      </span>

      <div className="absolute right-1 top-1">
        <FavoriteButton
          promptId={prompt.id}
          initial={prompt.isFavorite}
          disabled={locked || visiteur}
          sur
        />
      </div>

      {/* L'action ouvre la fiche : c'est la qu'on explique ce qu'il faut
          fournir avant de lancer. Un bouton qui lancerait directement
          demanderait des elements que l'utilisateur n'a pas encore sous les
          yeux. */}
      <div className="border-t border-[color:var(--color-line)] p-2.5">
        <button
          type="button"
          onClick={() => onOpen(prompt)}
          className="touch-target flex w-full items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-4 text-[15px] font-semibold text-white transition-[background-color,transform] duration-[var(--duration-fast)] active:scale-[0.99]"
        >
          {actionPrincipale(prompt)}
        </button>
      </div>
    </article>
  );
}
