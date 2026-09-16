'use client';

import { FavoriteButton } from '@/components/cards/favorite-button';
import { Icone } from '@/components/ui/icone';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * La carte d'un Mode IA, dans la liste des modes.
 *
 * Elle avait jusqu'ici le gabarit d'une carte de commande image : un cadre
 * haut occupe par la description en italique entre guillemets, a la place ou
 * une image aurait du etre. Le faux bloc de citation prenait les deux tiers
 * de la carte pour dire ce qu'une ligne suffit a dire, et laissait croire a
 * une illustration qui n'a pas charge.
 *
 * Ce qu'on veut savoir d'un mode tient en trois choses : quel role il joue,
 * ce qu'il resout, et comment y entrer. Elles sont dans cet ordre.
 *
 * Le fond lavande est le meme partout ou un mode apparait : c'est ce qui le
 * distingue d'une commande d'un coup d'oeil, sans etiquette a lire.
 *
 * « Explorer le mode » ouvre la fiche, et ne copie rien. Un mode ne s'active
 * pas depuis ici : RaccourcIA ne pilote pas l'IA de la personne, il lui donne
 * le texte a coller. Un bouton qui dirait « Activer » promettrait ce que le
 * produit ne fait pas — la fiche, elle, propose de copier.
 */
export function CarteMode({
  prompt,
  icone,
  locked,
  visiteur = false,
  onOpen,
}: {
  prompt: PromptCard;
  /** Le trait de la famille du mode, resolu au serveur. */
  icone: string | null;
  locked: boolean;
  visiteur?: boolean;
  onOpen: (prompt: PromptCard) => void;
}) {
  const promesse = prompt.shortDescription || prompt.resultSummary;

  return (
    <article className="anim-apparition relative flex flex-col gap-2.5 rounded-[color:var(--radius-card)] border border-[color:var(--color-mode-bord)] bg-[color:var(--color-mode-fond)] p-3">
      <div className="flex items-start gap-3">
        {icone ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-surface)] text-[color:var(--color-brand)]">
            <Icone svg={icone} taille={21} />
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          {/* Le favori laisse sa place au titre plutot que de le chevaucher :
              sans image sous lui, il n'a pas de coin ou se poser. */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[length:var(--texte-corps)] font-bold leading-tight text-[color:var(--color-night)]">
              {prompt.name}
            </h3>
            <span className="-mr-1.5 -mt-1.5 shrink-0">
              <FavoriteButton
                promptId={prompt.id}
                initial={prompt.isFavorite}
                disabled={locked || visiteur}
              />
            </span>
          </div>

          {promesse ? (
            <p className="mt-0.5 line-clamp-2 text-[length:var(--texte-carte)] leading-[1.4] text-[color:var(--color-muted)]">
              {promesse}
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpen(prompt)}
        className="touch-target flex w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-brand)]/35 bg-[color:var(--color-surface)] px-4 text-[length:var(--texte-carte)] font-semibold text-[color:var(--color-brand-strong)] transition-transform duration-[var(--duration-fast)] active:scale-[0.985]"
      >
        Explorer le mode
      </button>
    </article>
  );
}
