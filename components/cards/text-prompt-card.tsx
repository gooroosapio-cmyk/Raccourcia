'use client';

import { AccessBadge } from '@/components/cards/access-badge';
import { CopyCommandButton } from '@/components/cards/copy-command-button';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { VisualSlot } from '@/components/cards/visual-slot';
import { ResultThumbnail } from '@/components/cards/result-thumbnail';
import { BoutonJaime } from '@/components/cards/bouton-jaime';
import { IllustrationThematique } from '@/components/cards/illustration-thematique';
import { motifDeLaCarte } from '@/lib/ui/motifs';
import { usePaywall } from '@/components/paywall/paywall-provider';
import { decrireNiveau } from '@/lib/catalog/niveau';
import { nomDuGenre, repereDuMoteur } from '@/lib/catalog/experience';
import { LienDeCollection } from '@/components/cards/lien-de-collection';
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
 *
 * DEUX VISAGES, ET C'EST L'ADMINISTRATION QUI DECIDE LEQUEL.
 *
 * Tant qu'aucun visuel n'est depose, la carte garde celui-ci : le motif,
 * et la promesse de la commande posee dans le cadre. C'est le seul moyen
 * de remplir la zone haute quand il n'y a rien a montrer.
 *
 * Des qu'un visuel arrive, la carte bascule sur le visage des commandes
 * image : la photo occupe le cadre, le titre vient dessous, et
 * l'explication sous le titre. Rien ne se pose plus SUR la photo — un
 * texte sur une image se lit mal, il la couvre, et le bas de la carte
 * restait vide pendant ce temps. Deux zones distinctes valent mieux
 * qu'une superposition : chacune a sa place, et l'espace se remplit.
 */
export function TextPromptCard({
  prompt,
  provider,
  locked,
  free,
  visiteur = false,
  rayon,
  pleineLargeur = false,
  onOpen,
}: {
  prompt: PromptCardData;
  provider: string;
  locked: boolean;
  free: boolean;
  /** Vrai quand personne n'est connecte : le favori n'a pas ou se ranger. */
  visiteur?: boolean;
  /**
   * Le trait du rayon d'ou vient la carte, quand l'ecran le connait.
   *
   * Le dessin et non sa position : une carte est un composant client, et les
   * soixante-douze traits du kit vivent dans un seul objet — les resoudre ici
   * les ferait tous entrer dans le navigateur.
   */
  rayon?: string;
  /**
   * Vrai quand la carte occupe les deux colonnes.
   *
   * Un mode et un parcours demandent plus d'explication qu'une image : leur
   * promesse ne se devine pas d'un coup d'oeil, elle se lit. Sur une demi-
   * largeur, l'apercu se coupait au troisieme mot. Ils prennent donc la
   * rangee entiere, et le texte passe a cote du cadre plutot qu'en dessous.
   */
  pleineLargeur?: boolean;
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
  const genre = nomDuGenre(prompt);
  // Le nombre de livrables d'un parcours, et seulement sur la carte pleine
  // largeur : dans le carrousel, la carte fait une demi-colonne et la ligne
  // supplementaire repousserait le bouton hors du cadre.
  const repere = pleineLargeur ? repereDuMoteur(prompt) : null;

  // Le motif qui habille le cadre, choisi d'apres les tags de la commande.
  // Deux cent quarante cartes texte partageaient le meme rectangle bleu :
  // l'oeil ne s'accrochait nulle part, et rien ne distinguait un jeu de role
  // d'un plan de tresorerie. `null` quand aucun tag ne dit rien — la carte
  // garde alors sa composition typographique plutot qu'un dessin au hasard.
  const motif = motifDeLaCarte(prompt.motsCles);

  // Le visage de la carte. `thumbnailUrl` est rempli des qu'un visuel est
  // depose en administration : rien d'autre a basculer, la carte change
  // seule au rechargement suivant.
  const illustree = prompt.thumbnailUrl !== null;

  return (
    <article className="anim-apparition relative flex h-full flex-col overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => onOpen(prompt)}
        className={`text-left transition-transform duration-[var(--duration-fast)] active:scale-[0.985] ${
          pleineLargeur ? 'grid grid-cols-[104px_1fr] items-stretch' : 'flex flex-col'
        }`}
      >
        {illustree ? (
          /* Le visuel depose en administration, au meme cadre et au meme
             rendu que sur une commande image : la galerie ne doit pas
             faire deux familles de cartes la ou il n'y a qu'un catalogue. */
          <ResultThumbnail
            url={prompt.thumbnailUrl}
            alt={prompt.thumbnailAlt}
            libelle={prompt.name}
            mission={niveau?.mission ?? false}
            rayon={prompt.collectionSlug}
          />
        ) : (
          <VisualSlot ton="texte" mission={niveau?.mission ?? false}>
            {motif ? <IllustrationThematique motif={motif} /> : null}
            <span
              /* Le texte passe au-dessus du motif : le dessin habille le
                 cadre, il ne prend pas la place de ce qu'on lit. */
              style={{ position: 'relative' }}
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
        )}

        <span className={`block ${pleineLargeur ? 'px-3 pb-1 pt-3' : 'px-2.5 pb-1 pt-2'}`}>
          <span className="flex min-w-0 flex-col">
            {/* Le titre, pas la commande : « Rayon X » se lit sans connaitre la
                convention des raccourcis. Deux lignes reservees, toujours,
                sinon la galerie part en escalier. */}
            {/* Deux lignes reservees dans la grille, et seulement la :
                c'est ce qui empeche les cartes voisines de partir en
                escalier. Sur une carte pleine largeur, il n'y a pas de
                voisine a aligner, et la reserve ne fait qu'un grand vide
                sous un titre d'une ligne. */}
            <span
              className={`line-clamp-2 text-[length:var(--texte-titre-carte)] font-bold leading-[1.3] text-[color:var(--color-night)] ${
                pleineLargeur ? '' : 'min-h-[2.6em]'
              }`}
            >
              {prompt.name}
            </span>
            {/* L'EXPLICATION SOUS LE TITRE, ET SEULEMENT SUR UNE CARTE
                ILLUSTREE. Sans visuel, la promesse est deja dans le cadre
                du haut et la repeter ferait deux fois la meme phrase. Avec
                un visuel, le cadre ne dit plus rien de ce que la commande
                fait — et le bas de la carte, lui, etait vide. */}
            {illustree ? (
              <span
                className={`mt-0.5 text-[length:var(--texte-meta)] leading-snug text-[color:var(--color-muted)] ${
                  pleineLargeur ? 'line-clamp-3' : 'line-clamp-2 min-h-[2.4em]'
                }`}
              >
                {apercu}
              </span>
            ) : null}
            {repere ? (
              <span className="mt-0.5 text-[length:var(--texte-meta)] font-semibold text-[color:var(--color-brand-strong)]">
                {repere}
              </span>
            ) : null}
          </span>
        </span>
      </button>

      {/* Hors du bouton : un lien dans un bouton rend la cible imprevisible.
          Le genre — « Mode IA », « Parcours » — se lit ici, a cote du rayon,
          et non plus sur la ligne du bouton : la, il volait la moitie de la
          largeur et le libelle finissait coupe en « Personna… ». */}
      <div className={`flex items-baseline gap-2 ${pleineLargeur ? 'px-3 pb-1' : 'px-2.5 pb-1'}`}>
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

      {/* La copie ferme la carte, en bas, la ou se prend la decision. Le
          coeur l'accompagne : c'est la seule ligne de la carte ou une
          action a sa place, et le compte sous l'icone tient dans la
          hauteur du bouton sans rien pousser. */}
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
