'use client';

import { FavoriteButton } from '@/components/cards/favorite-button';
import { Icone } from '@/components/ui/icone';
import { lireLesLivrables } from '@/lib/catalog/moteur';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * La carte d'un Parcours guide.
 *
 * Un parcours ne se juge ni sur une image — il n'en produit pas une mais
 * plusieurs — ni sur une promesse, qui se ressemble d'un parcours a l'autre.
 * Il se juge sur ce qu'on en rapporte et sur la longueur de l'engagement.
 *
 * Les livrables sont donc montres, nommes, et comptes. Ils viennent du
 * catalogue, pas d'une estimation : `lireLesLivrables` ne rend un nombre que
 * s'il concorde avec celui annonce dans la meme phrase. Sans liste lisible,
 * la carte n'annonce rien plutot qu'un chiffre approchant.
 *
 * Trois noms au plus, puis « +2 » : une carte qui aligne sept libelles ne se
 * lit plus, et le detail est dans la fiche.
 */
const LIVRABLES_MONTRES = 3;

export function CarteParcours({
  prompt,
  icone,
  locked,
  visiteur = false,
  onOpen,
}: {
  prompt: PromptCard;
  /** Le trait de la famille du parcours, resolu au serveur. */
  icone: string | null;
  locked: boolean;
  visiteur?: boolean;
  onOpen: (prompt: PromptCard) => void;
}) {
  const promesse = prompt.shortDescription || prompt.resultSummary;
  const plan = lireLesLivrables(prompt.moteur?.livrables ?? null);
  const montres = plan?.etapes.slice(0, LIVRABLES_MONTRES) ?? [];
  const restants = (plan?.etapes.length ?? 0) - montres.length;

  return (
    <article className="anim-apparition flex flex-col gap-2.5 rounded-[color:var(--radius-card)] border border-[color:var(--color-parcours-bord)] bg-[color:var(--color-surface)] p-3">
      <div className="flex items-start gap-3">
        {icone ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-parcours-fond)] text-[color:var(--color-brand)]">
            <Icone svg={icone} taille={21} />
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
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

      {montres.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {montres.map((etape, rang) => (
            <li
              key={`${rang}-${etape.nom}`}
              className="rounded-full bg-[color:var(--color-parcours-fond)] px-2.5 py-1 text-[length:var(--texte-meta)] font-medium text-[color:var(--color-night)]"
            >
              {etape.nom}
            </li>
          ))}
          {restants > 0 ? (
            <li className="rounded-full px-1.5 py-1 text-[length:var(--texte-meta)] font-medium text-[color:var(--color-muted)]">
              +{restants}
            </li>
          ) : null}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => onOpen(prompt)}
        className="touch-target flex w-full items-center justify-center gap-1.5 rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-4 text-[length:var(--texte-carte)] font-semibold text-white transition-transform duration-[var(--duration-fast)] active:scale-[0.985]"
      >
        Voir le parcours
        {plan?.compte ? (
          /* Le nombre sur le bouton et non au-dessus : c'est au moment de
             s'engager qu'on veut savoir pour combien de fichiers on part. */
          <span className="font-normal text-white/80">· {plan.compte} livrables</span>
        ) : null}
      </button>
    </article>
  );
}
