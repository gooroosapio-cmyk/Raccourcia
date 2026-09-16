'use client';

import { AccessBadge } from '@/components/cards/access-badge';
import { CopyCommandButton } from '@/components/cards/copy-command-button';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { VisualSlot } from '@/components/cards/visual-slot';
import { usePaywall } from '@/components/paywall/paywall-provider';
import { decrireNiveau } from '@/lib/catalog/niveau';
import { repereDeCarte } from '@/lib/catalog/experience';
import type { PromptCard as PromptCardData } from '@/lib/catalog/types';

/**
 * Carte d'une commande sans visuel, au meme gabarit que la carte image.
 *
 * Les deux familles cohabitent dans une seule galerie : une carte plus courte
 * pour le texte creerait des trous en quinconce a chaque changement de rayon.
 *
 * La zone haute — celle que la carte image donne au visuel — porte ici un
 * apercu de ce que la commande produit : son intention, ou a defaut ce
 * qu'elle sait faire. Jamais une photographie d'illustration, qui promettrait
 * une image que la commande ne rend pas. Une composition typographique dit la
 * meme chose sans mentir sur le resultat.
 *
 * Le genre se lit en haut du cadre — « Mode IA », « Parcours » — parce que
 * c'est la seule chose qu'on ne devine pas d'un coup d'oeil quand il n'y a
 * pas d'image.
 */
export function TextPromptCard({
  prompt,
  provider,
  locked,
  free,
  visiteur = false,
  onOpen,
}: {
  prompt: PromptCardData;
  provider: string;
  locked: boolean;
  free: boolean;
  /** Vrai quand personne n'est connecte : le favori n'a pas ou se ranger. */
  visiteur?: boolean;
  onOpen: (prompt: PromptCardData) => void;
}) {
  const { open: ouvrirOffre } = usePaywall();
  const compatibles = prompt.providers.filter((entry) => entry.compatibility !== 'non_supporte');
  const actif = compatibles.find((entry) => entry.key === provider) ?? compatibles[0];
  const description = prompt.shortDescription || prompt.resultSummary;
  // L'intention dit ce que la commande cherche a obtenir ; la description dit
  // comment elle s'y prend. La premiere des deux qui existe tient le cadre.
  const apercu = prompt.intention?.trim() || description;
  const niveau = decrireNiveau(prompt.level, prompt.maxQuestions);
  const genre = repereDeCarte(prompt);

  return (
    <article className="anim-apparition relative flex flex-col overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => onOpen(prompt)}
        className="flex flex-1 flex-col text-left transition-transform duration-[var(--duration-fast)] active:scale-[0.985]"
      >
        <VisualSlot ton="texte" mission={niveau?.mission ?? false}>
          <span
            className={`flex h-full w-full flex-col justify-center gap-1.5 px-3 pt-3 ${
              niveau?.mission ? 'pb-8' : 'pb-3'
            }`}
          >
            {/* Le guillemet ouvrant fait lire ce qui suit comme un extrait :
                sans lui, une phrase seule au milieu d'un cadre ressemble a une
                legende manquante. */}
            <span
              aria-hidden="true"
              className="text-[26px] font-bold leading-none text-[color:var(--color-brand)]/30"
            >
              “
            </span>
            <span
              className={`text-[length:var(--texte-carte)] italic leading-[1.4] text-[color:var(--color-night)]/80 ${
                niveau?.mission ? 'line-clamp-4' : 'line-clamp-5'
              }`}
            >
              {apercu}
            </span>
          </span>
        </VisualSlot>

        <span className="flex flex-1 flex-col gap-0.5 px-2.5 pb-2.5 pt-2">
          {/* Le titre, pas la commande : « Rayon X » se lit sans connaitre la
              convention des raccourcis. Le raccourci attend dans la fiche. */}
          <span className="line-clamp-2 text-[length:var(--texte-titre-carte)] font-bold leading-[1.3] text-[color:var(--color-night)]">
            {prompt.name}
          </span>

          {genre ? (
            <span className="text-[length:var(--texte-meta)] font-medium text-[color:var(--color-muted)]">
              {genre}
            </span>
          ) : null}
        </span>
      </button>

      <span className="pointer-events-none absolute left-1.5 top-1.5">
        <AccessBadge free={free} locked={locked} isNew={prompt.isNew} />
      </span>

      <div className="absolute right-0.5 top-0.5 flex items-center">
        <CopyCommandButton
          promptId={prompt.id}
          provider={actif?.key ?? 'chatgpt'}
          surface="carte"
          pret={prompt.payloadReady}
          locked={locked}
          forme="icone"
          onLockedClick={ouvrirOffre}
        />
        <FavoriteButton
          promptId={prompt.id}
          initial={prompt.isFavorite}
          disabled={locked || visiteur}
          sur
        />
      </div>
    </article>
  );
}
