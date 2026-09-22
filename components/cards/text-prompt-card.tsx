'use client';

import Image from 'next/image';
import { AccessBadge } from '@/components/cards/access-badge';
import { CopyCommandButton } from '@/components/cards/copy-command-button';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { BoutonJaime } from '@/components/cards/bouton-jaime';
import { IllustrationThematique } from '@/components/cards/illustration-thematique';
import { motifDeLaCarte } from '@/lib/ui/motifs';
import { resumerPourCarte } from '@/lib/format/resume';
import { usePaywall } from '@/components/paywall/paywall-provider';
import { decrireNiveau } from '@/lib/catalog/niveau';
import { nomDuGenre, promesseDeCarte, repereDuMoteur } from '@/lib/catalog/experience';
import { LienDeCollection } from '@/components/cards/lien-de-collection';
import type { PromptCard as PromptCardData } from '@/lib/catalog/types';

/**
 * Carte d'une commande qui ne rend pas d'image.
 *
 * DEUX FORMES, PARCE QU'IL Y A DEUX PLACES.
 *
 * En GRILLE et en CARROUSEL, la carte fait 42 % d'un telephone et se lit en
 * trois tiers : le visuel, ce que la commande fait, puis son nom avec le
 * rayon et le bouton. C'etait auparavant un cadre typographique qui portait
 * la promesse — donc une carte illustree gagnait un bloc de description que
 * les autres n'avaient pas, et le carrousel ondulait. Trois zones de meme
 * hauteur, presentes qu'il y ait une photo ou non, alignent les cartes
 * texte sur les cartes image sans rien calculer.
 *
 * En PLEINE LARGEUR — un mode, un parcours pose dans le feed —, la carte est
 * un rectangle couche : le visuel tient la colonne de gauche sur toute la
 * hauteur, et la droite empile le titre, la description, le rayon et le
 * bouton. Elle montrait jusqu'ici le titre seul en haut a droite et laissait
 * dessous un grand vide blanc ; c'est ce vide que la description remplit.
 *
 * LE VISUEL VIENT DE L'ADMINISTRATION, ET IL EST FACULTATIF. Tant qu'aucune
 * illustration n'est deposee, le cadre porte le motif tire des tags de la
 * commande. Jamais une photographie d'emprunt : promettre une image a une
 * commande qui rend du texte serait mentir sur le resultat.
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
   * largeur, l'apercu se coupait au troisieme mot.
   */
  pleineLargeur?: boolean;
  onOpen: (prompt: PromptCardData) => void;
}) {
  const { open: ouvrirOffre } = usePaywall();
  const compatibles = prompt.providers.filter((entry) => entry.compatibility !== 'non_supporte');
  const actif = compatibles.find((entry) => entry.key === provider) ?? compatibles[0];

  // La promesse de la commande, choisie par `promesseDeCarte` — la
  // description d'abord, l'intention en dernier recours : depuis l'import du
  // moteur V3, `intention` porte le cadrage complet, garde-fous compris.
  //
  // Bornee au mot pres, et pas seulement a l'affichage : les descriptions du
  // catalogue vont de six mots a cent cinquante, et une carte qui les rend
  // telles quelles n'a pas de taille. La suite est dans la fiche, a un geste
  // de la — c'est ce que disent les points de suspension.
  const apercu = resumerPourCarte(promesseDeCarte(prompt));
  const niveau = decrireNiveau(prompt.level, prompt.maxQuestions);
  const genre = nomDuGenre(prompt);
  const repere = pleineLargeur ? repereDuMoteur(prompt) : null;
  const motif = motifDeLaCarte(prompt.motsCles);

  const visuel = (
    <Visuel
      url={prompt.thumbnailUrl}
      alt={prompt.thumbnailAlt}
      nom={prompt.name}
      motif={motif}
      mission={niveau?.mission ?? false}
    />
  );

  const action = (
    <div className="flex items-center gap-1">
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
          // Sur une demi-carte, le libelle s'affichait « Copi… » : on
          // n'ecrit que ce qui tient en entier, l'icone dit le reste.
          iconeSeule={!pleineLargeur}
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
  );

  const marques = (
    <>
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
    </>
  );

  /* --- Le rectangle couche : visuel a gauche, tout le reste a droite --- */
  if (pleineLargeur) {
    return (
      <article className="anim-apparition relative flex overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
        {/* Le visuel tient toute la hauteur de la carte : une vignette au
            format fixe laissait une bande vide sous elle des que la colonne
            de droite s'allongeait. */}
        <span className="relative block w-[116px] shrink-0 overflow-hidden bg-[color:var(--color-sky)]">
          {visuel}
        </span>

        <div className="flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={() => onOpen(prompt)}
            className="flex-1 px-3 pt-3 text-left transition-transform duration-[var(--duration-fast)] active:scale-[0.99]"
          >
            {/* DEUX LIGNES RESERVEES, ICI COMME AILLEURS. Sans reserve, un
                titre court et un titre long donnent deux cartes de hauteurs
                differentes, et le feed perd son rythme.

                Pas de classe `block` a cote d'un `line-clamp` : les deux
                posent `display`, la seconde ecrite dans la feuille gagne, et
                c'est `block` — la coupe ne s'appliquait donc pas du tout.
                C'est ce qui donnait des cartes de onze lignes. */}
            <span className="line-clamp-2 min-h-[2.6em] text-[length:var(--texte-titre-carte)] font-bold leading-[1.3] text-[color:var(--color-night)]">
              {prompt.name}
            </span>
            {/* CE QUI REMPLIT LE VIDE. La carte montrait son titre puis
                trois centimetres de blanc : la place existait, personne ne
                l'utilisait. Deux lignes, pas trois : le texte est deja borne
                au mot pres, la coupe visuelle n'est plus qu'un garde-fou. */}
            <span className="mt-1 line-clamp-2 min-h-[2.75em] text-[length:var(--texte-meta)] leading-snug text-[color:var(--color-muted)]">
              {apercu}
            </span>
          </button>

          {/* Hors du bouton : un lien dans un bouton rend la cible
              imprevisible.

              Le repere du moteur — « 4 livrables » — tient sur cette ligne
              plutot que sur la sienne : il ne concerne que les parcours, et
              une ligne qui n'apparait que sur certaines cartes suffit a
              rendre la hauteur du feed irreguliere. */}
          <div className="flex items-baseline gap-2 px-3 pb-1 pt-1.5">
            <span className="min-w-0 flex-1">
              <LienDeCollection prompt={prompt} trait={rayon} />
            </span>
            {repere ? (
              <span className="shrink-0 text-[length:var(--texte-meta)] font-semibold text-[color:var(--color-brand-strong)]">
                {repere}
              </span>
            ) : null}
            {genre ? (
              <span className="shrink-0 text-[length:var(--texte-meta)] font-medium text-[color:var(--color-muted)]">
                {genre}
              </span>
            ) : null}
          </div>

          <div className="px-3 pb-3">{action}</div>
        </div>

        {marques}
      </article>
    );
  }

  /* --- La carte de grille --- */
  //
  // LE VISUEL EST LA SEULE PARTIE ELASTIQUE, ET C'EST TOUT L'ENJEU.
  //
  // La carte se partageait en tiers : deux tiers pour le visuel et la
  // description, un tiers pour le nom, le rayon et le bouton. Une
  // proportion ne sait pas ce qu'elle contient. Le dernier tiers devait
  // loger deux lignes de titre, une ligne de rayon et une cible de 44 px —
  // sur une carte de galerie, cela ne tient pas dans un tiers, et
  // `overflow-hidden` tranchait le coeur et le bouton a mi-hauteur.
  //
  // Le texte prend donc la hauteur qu'il lui faut, et le visuel prend ce
  // qui reste. Il ne peut plus rien pousser dehors : c'est lui qui cede,
  // borne par un `min-h` pour ne pas disparaitre. Les espacements entre les
  // trois lignes de texte sont resserres dans le meme mouvement — chaque
  // demi-pixel gagne la remonte le bouton d'autant.
  return (
    <article className="anim-apparition relative flex h-full flex-col overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => onOpen(prompt)}
        className="flex min-h-0 flex-1 flex-col text-left transition-transform duration-[var(--duration-fast)] active:scale-[0.985]"
      >
        {/* Le visuel : la seule partie qui cede. `min-h` l'empeche de
            disparaitre quand la carte n'a aucune voisine plus haute. */}
        <span className="relative block min-h-[92px] flex-1 overflow-hidden bg-[color:var(--color-sky)]">
          {visuel}
        </span>

        {/* Ce que la commande fait. Hauteur naturelle : deux lignes
            reservees, trois au plus. */}
        <span className="flex shrink-0 items-start px-2.5 pt-1.5">
          <span className="line-clamp-3 min-h-[2.75em] text-[length:var(--texte-meta)] leading-snug text-[color:var(--color-muted)]">
            {apercu}
          </span>
        </span>
      </button>

      {/* Le nom, le rayon, le geste : hauteur naturelle, jamais comprimee. */}
      <div className="flex shrink-0 flex-col px-2.5 pb-2.5 pt-0.5">
        <button
          type="button"
          onClick={() => onOpen(prompt)}
          className="block text-left"
          // Le titre ouvre la fiche comme le visuel : on touche ce qu'on
          // lit. Deux lignes reservees, sinon la grille part en escalier.
          //
          // `block` a ete retire du span : pose a cote d'un `line-clamp`, il
          // gagnait sur lui et la coupe ne s'appliquait pas. Un titre de
          // quatre lignes poussait alors le coeur et le bouton hors du cadre,
          // que `overflow-hidden` finissait de trancher.
        >
          <span className="line-clamp-2 min-h-[2.6em] text-[length:var(--texte-titre-carte)] font-bold leading-[1.3] text-[color:var(--color-night)]">
            {prompt.name}
          </span>
        </button>

        {/* Sans marge sous cette ligne : le lien de collection porte deja sa
            propre hauteur de cible, et l'espace qu'on gagne ici est celui
            qui manquait au bouton. */}
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1">
            <LienDeCollection prompt={prompt} trait={rayon} />
          </span>
          {genre ? (
            <span className="shrink-0 text-[length:var(--texte-meta)] font-medium text-[color:var(--color-muted)]">
              {genre}
            </span>
          ) : null}
        </div>

        <div className="mt-auto">{action}</div>
      </div>

      {marques}
    </article>
  );
}

/**
 * Ce qu'on montre dans le cadre : la photo si elle existe, le motif sinon.
 *
 * Le motif n'est pas un pis-aller. Deux cent quarante cartes texte
 * partageaient le meme rectangle bleu : l'oeil ne s'accrochait nulle part, et
 * rien ne distinguait un jeu de role d'un plan de tresorerie. Le motif vient
 * des tags de la commande — un personnage pour l'immersion, un de pour le
 * jeu, un graphique pour l'analyse.
 */
function Visuel({
  url,
  alt,
  nom,
  motif,
  mission,
}: {
  url: string | null;
  alt: string | null;
  nom: string;
  motif: ReturnType<typeof motifDeLaCarte>;
  mission: boolean;
}) {
  return (
    <>
      {url ? (
        <Image
          src={url}
          alt={alt ?? `Illustration de ${nom}`}
          fill
          sizes="(max-width: 640px) 50vw, 300px"
          loading="lazy"
          className="object-cover"
        />
      ) : motif ? (
        <IllustrationThematique motif={motif} />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-[color:var(--color-sky)] to-[color:var(--color-canvas)]"
        />
      )}

      {mission ? (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-[color:var(--color-night)]/70 px-2 py-0.5 text-[length:var(--texte-meta)] font-medium text-white backdrop-blur-[2px]">
          Mission
        </span>
      ) : null}
    </>
  );
}
