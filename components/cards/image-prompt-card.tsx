'use client';

import { AILogo } from '@/components/brand/ai-logos';
import { AccessBadge } from '@/components/cards/access-badge';
import { CopyCommandButton } from '@/components/cards/copy-command-button';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { ResultThumbnail } from '@/components/cards/result-thumbnail';
import { usePaywall } from '@/components/paywall/paywall-provider';
import { decrireNiveau } from '@/lib/catalog/niveau';
import type { PromptCard as PromptCardData } from '@/lib/catalog/types';

/**
 * Carte d'une commande image, pensee pour une demi-largeur d'ecran.
 *
 * Deux colonnes montrent quatre a six commandes par ecran la ou une seule en
 * montrait une : sur un catalogue de trois cents entrees, c'est la difference
 * entre parcourir et faire defiler.
 *
 * La vignette montre le resultat seul. Le badge d'acces et le favori sont
 * poses dessus plutot qu'en dessous : dans une carte etroite, chaque ligne de
 * texte gagnee revient a une commande de plus a l'ecran.
 *
 * L'ouverture de la fiche tient dans un seul bouton, image et texte compris :
 * deux zones cliquables pour une meme action doubleraient les arrets du
 * clavier et feraient lire la commande deux fois a un lecteur d'ecran. Le
 * favori et la copie sont des freres, jamais des enfants — un bouton ne
 * s'imbrique pas dans un bouton.
 *
 * Le visuel verrouille est floute. C'est un signal commercial, pas une
 * protection : le contenu premium n'atteint jamais le client, il ne sort que
 * par resolve_prompt apres ses six controles.
 */
export function ImagePromptCard({
  prompt,
  provider,
  locked,
  free,
  masque = false,
  visiteur = false,
  priority,
  onOpen,
}: {
  prompt: PromptCardData;
  provider: string;
  locked: boolean;
  free: boolean;
  /**
   * Vrai pour un visiteur devant une commande verrouillee : le nom de la
   * commande disparait, seule sa description reste. Le nom est ce qui se
   * recopie dans ChatGPT — l'afficher a qui n'a pas encore d'acces revient a
   * donner l'etiquette du produit et a garder la boite.
   */
  masque?: boolean;
  /** Vrai quand personne n'est connecte : le favori n'a pas ou se ranger. */
  visiteur?: boolean;
  priority: boolean;
  onOpen: (prompt: PromptCardData) => void;
}) {
  const { open: ouvrirOffre } = usePaywall();
  const compatibles = prompt.providers.filter((entry) => entry.compatibility !== 'non_supporte');
  const actif = compatibles.find((entry) => entry.key === provider) ?? compatibles[0];
  const description = prompt.shortDescription || prompt.resultSummary;
  const niveau = decrireNiveau(prompt.level, prompt.maxQuestions);

  return (
    <article className="anim-apparition relative flex flex-col overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => onOpen(prompt)}
        className="flex flex-1 flex-col text-left"
      >
        <span className="relative block w-full">
          {/* L'agrandissement evite les bords transparents que laisse le flou. */}
          <span className={`block ${locked ? 'scale-[1.06] blur-[7px]' : ''}`}>
            <ResultThumbnail
              url={prompt.thumbnailUrl}
              alt={masque ? description : prompt.thumbnailAlt}
              libelle={prompt.name}
              mission={niveau?.mission ?? false}
              priority={priority}
            />
          </span>
          {locked ? (
            <span aria-hidden="true" className="absolute inset-0 bg-[color:var(--color-night)]/5" />
          ) : null}
        </span>

        <span className="flex flex-1 flex-col gap-1 px-2.5 pb-2 pt-2">
          {/* Le titre, pas la commande. « Rayon X » se comprend sans rien
              savoir du produit ; « /xray » demande de deja connaitre la
              convention. Le raccourci attend dans la fiche, ou il est
              explique et copiable. */}
          <span className="line-clamp-3 text-[length:var(--texte-titre-carte)] font-bold leading-[1.3] text-[color:var(--color-night)]">
            {prompt.name}
          </span>

          {/* Ce que fait ce raccourci, pas le format qu'il produit :
              `result_summary` se repete a l'identique sur toute une famille. */}
          <span className="line-clamp-2 text-[length:var(--texte-carte)] leading-[1.35] text-[color:var(--color-muted)]">
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
