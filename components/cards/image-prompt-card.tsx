'use client';

import { AccessBadge } from '@/components/cards/access-badge';
import { CopyCommandButton } from '@/components/cards/copy-command-button';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { ResultThumbnail } from '@/components/cards/result-thumbnail';
import { usePaywall } from '@/components/paywall/paywall-provider';
import { decrireNiveau } from '@/lib/catalog/niveau';
import { repereDeCarte } from '@/lib/catalog/experience';
import type { PromptCard as PromptCardData } from '@/lib/catalog/types';

/**
 * Carte de galerie : le resultat, son nom, et rien de plus.
 *
 * Elle portait jusqu'ici une description sur deux lignes, trois logos d'IA et
 * un bouton de copie pleine largeur. Dans une grille a deux colonnes, cela
 * faisait plus de texte que d'image : on parcourait des fiches, pas des
 * resultats. Ce qui a ete retire n'a pas disparu — formats, livrables,
 * modeles compatibles et instructions attendent dans la fiche, ou l'on va
 * precisement pour les lire.
 *
 * Reste ce qui sert a choisir : le visuel, un titre court, et au plus un
 * repere quand il change la decision — « 1 photo » dit qu'il faudra fournir
 * quelque chose.
 *
 * Toucher la carte ouvre la fiche. Le favori et la copie sont des freres,
 * jamais des enfants : un bouton ne s'imbrique pas dans un bouton, et l'on
 * n'enregistre pas une idee en voulant la regarder.
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
   * Vrai pour un visiteur devant une commande verrouillee : le nom disparait,
   * seule la description reste. Le nom est ce qui se recopie dans une IA —
   * l'afficher a qui n'a pas encore d'acces revient a donner l'etiquette du
   * produit et a garder la boite.
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
  const repere = repereDeCarte(prompt);

  return (
    <article className="anim-apparition group relative flex flex-col overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => onOpen(prompt)}
        className="flex flex-1 flex-col text-left transition-transform duration-[var(--duration-fast)] active:scale-[0.985]"
      >
        <span className="relative block w-full">
          {/* L'agrandissement evite les bords transparents que laisse le flou. */}
          <span
            className={`block ${
              locked
                ? 'scale-[1.06] blur-[7px]'
                : // Le zoom au survol n'existe que la ou il y a un curseur :
                  // sur mobile il ne se declencherait qu'apres le toucher,
                  // c'est-a-dire une fois la fiche ouverte.
                  'transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)] motion-safe:group-hover:scale-[1.03]'
            }`}
          >
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

        <span className="flex flex-1 flex-col gap-0.5 px-2.5 pb-2.5 pt-2">
          {/* Le titre, pas la commande. « Rayon X » se comprend sans rien
              savoir du produit ; « /xray » demande de deja connaitre la
              convention. Le raccourci attend dans la fiche, ou il est
              explique et copiable. */}
          <span className="line-clamp-2 text-[length:var(--texte-titre-carte)] font-bold leading-[1.3] text-[color:var(--color-night)]">
            {prompt.name}
          </span>

          {repere ? (
            <span className="text-[length:var(--texte-meta)] font-medium text-[color:var(--color-muted)]">
              {repere}
            </span>
          ) : null}
        </span>
      </button>

      <span className="pointer-events-none absolute left-1.5 top-1.5">
        <AccessBadge free={free} locked={locked} isNew={prompt.isNew} />
      </span>

      {/* Les deux gestes secondaires, poses sur le visuel : enregistrer et
          copier. Ils ne prennent aucune ligne de texte a la carte. */}
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
