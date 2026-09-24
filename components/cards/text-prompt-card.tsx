'use client';

import Image from 'next/image';
import { AccessBadge } from '@/components/cards/access-badge';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { IllustrationThematique } from '@/components/cards/illustration-thematique';
import { VisualSlot } from '@/components/cards/visual-slot';
import { motifDeLaCarte } from '@/lib/ui/motifs';
import { resumerPourCarte } from '@/lib/format/resume';
import { decrireNiveau } from '@/lib/catalog/niveau';
import { nomDuGenre, promesseDeCarte, repereDuMoteur } from '@/lib/catalog/experience';
import { LienDeCollection } from '@/components/cards/lien-de-collection';
import type { PromptCard as PromptCardData } from '@/lib/catalog/types';

/**
 * Carte d'une commande Redaction ou Assistants.
 *
 * LA MEME EMPRISE QU'UNE CARTE VISUELS. Un cadre 4:5, le titre sur deux
 * lignes, le coeur : les trois univers se parcourent avec les memes yeux.
 * Ce qui remplit le cadre change — une commande qui rend du texte n'a pas
 * de photo a montrer, et lui en preter une serait mentir sur le resultat.
 *
 *   * Redaction : la promesse, posee comme un extrait de texte.
 *   * Assistants : la promesse en bulle, comme l'amorce d'une conversation
 *     — c'est ce que l'on ouvre en collant la commande.
 *
 * Une illustration deposee par l'administration passe avant les deux :
 * quelqu'un l'a choisie pour cette commande.
 *
 * AUCUNE COPIE DEPUIS LA CARTE. Toute la carte ouvre la fiche, ou se
 * trouvent les champs a completer et le bouton « Copier le prompt ». Une
 * copie en miniature livrait un texte sans ses champs, et une fleche
 * d'envoi de plus dans chaque carte ne disait rien de plus que la carte.
 *
 * En PLEINE LARGEUR — un mode, un parcours pose dans le feed —, la carte
 * reste un rectangle couche : le visuel a gauche, le titre et la promesse a
 * droite.
 */
export function TextPromptCard({
  prompt,
  locked,
  free,
  visiteur = false,
  rayon,
  pleineLargeur = false,
  onOpen,
}: {
  prompt: PromptCardData;
  locked: boolean;
  free: boolean;
  /** Vrai quand personne n'est connecte : le coeur explique pourquoi se connecter. */
  visiteur?: boolean;
  /**
   * Le trait du rayon d'ou vient la carte, quand l'ecran le connait.
   *
   * Le dessin et non sa position : une carte est un composant client, et les
   * soixante-douze traits du kit vivent dans un seul objet — les resoudre ici
   * les ferait tous entrer dans le navigateur.
   */
  rayon?: string;
  /** Vrai quand la carte occupe les deux colonnes (un mode, un parcours du feed). */
  pleineLargeur?: boolean;
  onOpen: (prompt: PromptCardData) => void;
}) {
  // La promesse de la commande, bornee au mot pres : les descriptions du
  // catalogue vont de six mots a cent cinquante. La suite est dans la fiche.
  const apercu = resumerPourCarte(promesseDeCarte(prompt));
  const niveau = decrireNiveau(prompt.level, prompt.maxQuestions);
  const genre = nomDuGenre(prompt);
  const repere = pleineLargeur ? repereDuMoteur(prompt) : null;

  const marques = (
    <>
      <span className="pointer-events-none absolute left-1.5 top-1.5">
        <AccessBadge free={free} locked={locked} isNew={prompt.isNew} />
      </span>
      <div className="absolute right-0.5 top-0.5">
        <FavoriteButton
          promptId={prompt.id}
          initial={prompt.isFavorite}
          disabled={locked}
          visiteur={visiteur}
          sur
        />
      </div>
    </>
  );

  const ligneDuRayon = (
    <div className="flex items-baseline gap-2 px-2.5 pb-2.5">
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
  );

  /* --- Le rectangle couche : visuel a gauche, titre et promesse a droite --- */
  if (pleineLargeur) {
    return (
      <article className="anim-apparition relative flex overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
        <span className="relative block w-[116px] shrink-0 overflow-hidden bg-[color:var(--color-sky)]">
          <Visuel
            url={prompt.thumbnailUrl}
            alt={prompt.thumbnailAlt}
            nom={prompt.name}
            motif={motifDeLaCarte(prompt.motsCles)}
            mission={niveau?.mission ?? false}
          />
        </span>

        <div className="flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={() => onOpen(prompt)}
            aria-label={`Voir la commande ${prompt.name}`}
            className="flex-1 px-3 pb-1 pt-3 text-left transition-transform duration-[var(--duration-fast)] active:scale-[0.99]"
          >
            {/* Pas de `block` a cote d'un `line-clamp` : les deux posent
                `display`, et la coupe ne s'appliquerait pas. */}
            <span className="line-clamp-2 min-h-[2.6em] pr-9 text-[length:var(--texte-titre-carte)] font-bold leading-[1.3] text-[color:var(--color-night)]">
              {prompt.name}
            </span>
            <span className="mt-1 line-clamp-2 min-h-[2.75em] text-[length:var(--texte-meta)] leading-snug text-[color:var(--color-muted)]">
              {apercu}
            </span>
          </button>
          {ligneDuRayon}
        </div>

        {marques}
      </article>
    );
  }

  /* --- La carte de grille : meme charpente que la carte Visuels --- */
  return (
    <article className="anim-apparition relative flex h-full flex-col overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => onOpen(prompt)}
        aria-label={`Voir la commande ${prompt.name}`}
        className="flex flex-col text-left transition-transform duration-[var(--duration-fast)] active:scale-[0.985]"
      >
        <VisualSlot
          ton={prompt.thumbnailUrl ? 'media' : 'texte'}
          mission={niveau?.mission ?? false}
        >
          {prompt.thumbnailUrl ? (
            <Image
              src={prompt.thumbnailUrl}
              alt={prompt.thumbnailAlt ?? `Illustration de ${prompt.name}`}
              fill
              sizes="(max-width: 640px) 50vw, 300px"
              loading="lazy"
              className="object-cover"
            />
          ) : (
            <ApercuTypographique texte={apercu} conversation={prompt.library === 'reflexions'} />
          )}
        </VisualSlot>

        {/* Deux lignes, toujours : `min-h` reserve la seconde meme quand le
            titre tient sur une, sinon la grille part en escalier. */}
        <span className="block px-2.5 pb-1 pt-2">
          <span className="line-clamp-2 min-h-[2.6em] text-[length:var(--texte-titre-carte)] font-bold leading-[1.3] text-[color:var(--color-night)]">
            {prompt.name}
          </span>
        </span>
      </button>

      {/* Hors du bouton : un lien dans un bouton rend la cible imprevisible. */}
      <div className="mt-auto">{ligneDuRayon}</div>

      {marques}
    </article>
  );
}

/**
 * L'apercu d'une commande qui rend du texte, dans le cadre 4:5.
 *
 * Pas une image : le texte lui-meme, lisible, mis en page. Le haut du cadre
 * reste libre pour le badge et le coeur, qui s'y posent comme sur une photo.
 */
function ApercuTypographique({ texte, conversation }: { texte: string; conversation: boolean }) {
  if (conversation) {
    return (
      <span
        aria-hidden="true"
        className="absolute inset-0 flex flex-col justify-end gap-1.5 p-2.5 pt-12"
      >
        <span className="line-clamp-6 self-start rounded-[14px] rounded-bl-[4px] bg-[color:var(--color-surface)] px-2.5 py-2 text-[12px] leading-snug text-[color:var(--color-night)] shadow-[var(--shadow-card)]">
          {texte}
        </span>
        <span className="flex h-6 w-11 items-center justify-center gap-1 self-end rounded-full bg-[color:var(--color-brand)]">
          <span className="h-1 w-1 rounded-full bg-white/90" />
          <span className="h-1 w-1 rounded-full bg-white/70" />
          <span className="h-1 w-1 rounded-full bg-white/50" />
        </span>
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="absolute inset-0 flex flex-col p-3 pt-12">
      <span className="text-[28px] font-bold leading-none text-[color:var(--color-brand)]/40">
        “
      </span>
      <span className="line-clamp-6 text-[13px] font-medium leading-snug text-[color:var(--color-night)]">
        {texte}
      </span>
    </span>
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
