'use client';

import { AccessBadge } from '@/components/cards/access-badge';
import { CopyCommandButton } from '@/components/cards/copy-command-button';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { BoutonJaime } from '@/components/cards/bouton-jaime';
import { ResultThumbnail } from '@/components/cards/result-thumbnail';
import { LienDeCollection } from '@/components/cards/lien-de-collection';
import { usePaywall } from '@/components/paywall/paywall-provider';
import { decrireNiveau } from '@/lib/catalog/niveau';
import { nomDuGenre, promesseDeCarte } from '@/lib/catalog/experience';
import type { PromptCard as PromptCardData } from '@/lib/catalog/types';

/**
 * Carte de galerie : le resultat, son nom, de quoi le copier.
 *
 * Trois choses ont ete apprises a l'usage.
 *
 * « 1 photo » sous chaque vignette ne distinguait rien : presque toutes les
 * commandes image en demandent une. Un signe qui se repete a l'identique sur
 * vingt cartes n'informe pas, il occupe une ligne. A sa place, l'icone du
 * rayon d'ou vient la carte — le meme dessin que la pastille qui y mene.
 *
 * Le bouton de copie est descendu sous le titre. Pose sur la vignette, il
 * masquait le resultat a l'endroit ou l'oeil se porte, et deux pastilles
 * rondes sur une image faisaient plus penser a une barre d'outils qu'a une
 * idee.
 *
 * Toutes les cartes ont la meme hauteur, et le titre occupe deux lignes
 * qu'il en remplisse une ou deux. Sans cela, une galerie a deux colonnes se
 * decale a chaque titre court et le regard suit des marches d'escalier.
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
  rayon,
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
  /**
   * Le trait du rayon d'ou vient la carte, quand l'ecran le connait.
   *
   * Le dessin et non sa position : une carte est un composant client, et les
   * soixante-douze traits du kit vivent dans un seul objet — les resoudre ici
   * les ferait tous entrer dans le navigateur.
   */
  rayon?: string;
  onOpen: (prompt: PromptCardData) => void;
}) {
  const { open: ouvrirOffre } = usePaywall();
  const compatibles = prompt.providers.filter((entry) => entry.compatibility !== 'non_supporte');
  const actif = compatibles.find((entry) => entry.key === provider) ?? compatibles[0];
  const description = promesseDeCarte(prompt);
  const niveau = decrireNiveau(prompt.level, prompt.maxQuestions);
  const genre = nomDuGenre(prompt);

  return (
    <article className="anim-apparition group relative flex h-full flex-col overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => onOpen(prompt)}
        className="flex flex-col text-left transition-transform duration-[var(--duration-fast)] active:scale-[0.985]"
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
              // La teinte du cadre suit le rayon lui-meme, pas son dessin :
              // deux rayons voisins ont deux teintes, et elles ne bougent pas
              // quand on reordonne le catalogue.
              rayon={prompt.collectionSlug}
            />
          </span>
          {locked ? (
            <span aria-hidden="true" className="absolute inset-0 bg-[color:var(--color-night)]/5" />
          ) : null}
        </span>

        {/* Deux lignes, toujours : `min-h` reserve la seconde meme quand le
            titre tient sur une, sinon la grille part en escalier. */}
        <span className="block px-2.5 pb-1 pt-2">
          <span className="line-clamp-2 min-h-[2.6em] text-[length:var(--texte-titre-carte)] font-bold leading-[1.3] text-[color:var(--color-night)]">
            {prompt.name}
          </span>
        </span>
      </button>

      {/* Hors du bouton : un lien dans un bouton rend la cible imprevisible.
          Le genre monte ici, a cote du rayon : il occupait la ligne du bas,
          ou le coeur et son compte ont maintenant besoin de la place. */}
      <div className="flex items-baseline gap-2 px-2.5 pb-1">
        <span className="min-w-0 flex-1">
          <LienDeCollection prompt={prompt} trait={rayon} />
        </span>
        {genre ? (
          <span className="shrink-0 text-[length:var(--texte-meta)] font-medium text-[color:var(--color-muted)]">
            {genre}
          </span>
        ) : null}
      </div>

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

      {/* La copie ferme la carte, en bas, la ou se prend la decision : on
          regarde le resultat, on lit le titre, on copie. */}
      <div className="mt-auto flex items-center gap-1 px-2.5 pb-2.5">
        <BoutonJaime
          promptId={prompt.id}
          likeCount={prompt.likeCount}
          aime={prompt.aime}
          visiteur={visiteur}
        />
        <span className="block min-w-0 flex-1">
          <CopyCommandButton
            promptId={prompt.id}
            provider={actif?.key ?? 'chatgpt'}
            surface="carte"
            pret={prompt.payloadReady}
            locked={locked}
            compact
            // Sur une demi-carte, « Copier » s'affichait « Copi… » : on
            // n'ecrit que ce qui tient en entier, l'icone dit le reste.
            iconeSeule
            genre={prompt.entityType}
            // Une commande a personnaliser ne se copie pas depuis la
            // galerie : il n'y a pas de formulaire ici, et livrer le texte
            // sans ses valeurs reviendrait a le livrer incomplet sans le
            // dire. Le bouton ouvre la fiche, ou les champs existent.
            aPersonnaliser={prompt.champs.length > 0}
            onPersonnaliser={() => onOpen(prompt)}
            onLockedClick={ouvrirOffre}
          />
        </span>
      </div>
    </article>
  );
}
