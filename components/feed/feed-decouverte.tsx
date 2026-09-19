'use client';

import { Fragment, useCallback, useMemo, useState, type ReactNode } from 'react';
import { ImagePromptCard } from '@/components/cards/image-prompt-card';
import { TextPromptCard } from '@/components/cards/text-prompt-card';
import { PromptDetailSheet } from '@/components/detail/prompt-detail';
import { openPaywall } from '@/components/paywall/paywall-provider';
import { trackPromptView } from '@/lib/actions/catalog';
import { usePreferredProvider } from '@/lib/catalog/use-preferred-provider';
import { FiltresDeGalerie } from '@/components/feed/filtres-galerie';
import { appliquerLesFiltres, type FiltresGalerie } from '@/lib/catalog/sujets';
import { Sentinelle } from '@/components/feed/sentinelle';
import { decouperLeFeed } from '@/lib/catalog/feed';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * La galerie de decouverte, et la fiche qu'elle ouvre.
 *
 * Deux colonnes, et la meme carte que partout ailleurs. Le feed montrait une
 * carte pleine largeur par idee : visuel, sur-titre, titre, description sur
 * deux lignes, trois reperes et un bouton — soit un ecran entier pour une
 * seule proposition. On ne decouvrait rien, on faisait defiler.
 *
 * Meme mecanique que la grille : l'etat de la fiche vit ici, donc l'ouvrir
 * puis la fermer ne retouche jamais la galerie — le defilement reste ou il
 * etait, ce qui compte d'autant plus dans une liste qu'on parcourt longtemps.
 *
 * La galerie s'allonge par paliers plutot que d'arriver entiere : soixante
 * vignettes chargees d'un coup sur un reseau mobile reviennent a ne rien
 * afficher pendant plusieurs secondes.
 *
 * Le palier suivant vient de lui-meme. Il fallait viser un bouton tous les
 * vingt-quatre cartes pour continuer a descendre, c'est-a-dire demander la
 * permission de continuer a regarder. La sentinelle du bas s'en charge, une
 * hauteur d'ecran a l'avance, et garde le bouton pour le clavier.
 *
 * Vingt-quatre par palier, soit douze rangees de deux : assez pour que le
 * chargement suivant ne se remarque pas, assez peu pour qu'il soit court.
 */
const PALIER = 24;

/**
 * Ce qui s'intercale entre deux cartes : une reprise, une invitation a ouvrir
 * un rayon. `apres` compte les cartes reellement affichees, donc un
 * intercalaire pose trop loin attend le palier suivant plutot que de remonter.
 */
export type Intercalaire = { cle: string; apres: number; noeud: ReactNode };

export function FeedDecouverte({
  prompts,
  locked,
  visiteur = false,
  initialProvider = 'chatgpt',
  intercalaires = [],
  rayons,
  filtrable = false,
  chargerLaSuite,
}: {
  prompts: PromptCard[];
  locked: boolean;
  visiteur?: boolean;
  initialProvider?: string;
  intercalaires?: Intercalaire[];
  /** A quel rayon appartient chaque collection, par position. */
  rayons?: Record<string, string>;
  /**
   * Propose de restreindre la galerie : format, sujet, acces.
   *
   * Des menus deroulants et non des puces : chaque groupe ferait trois ou
   * quatre pastilles en travers de l'ecran, au-dessus d'une galerie qui a
   * besoin de sa hauteur. Le menu natif ouvre la liste du systeme, que le
   * pouce connait deja.
   */
  filtrable?: boolean;
  /**
   * De quoi prolonger la galerie au-dela du vivier initial.
   *
   * Sans elle, la galerie s'arrete a ce que la page a charge — soixante
   * cartes — et rien ne dit qu'il en existe six cents de plus. Avec elle,
   * elle continue tant que le catalogue en a, palier par palier.
   *
   * Absente pour les galeries bornees : une rangee de reprises n'a pas de
   * suite a chercher.
   */
  chargerLaSuite?: (page: number) => Promise<PromptCard[]>;
}) {
  const [selection, setSelection] = useState<PromptCard | null>(null);
  const [filtres, setFiltres] = useState<FiltresGalerie>({});
  const [montrees, setMontrees] = useState(PALIER);
  const [provider, changeProvider] = usePreferredProvider(initialProvider);

  // Ce que le serveur a envoye en plus du vivier initial, et jusqu'ou on
  // est alle. `fini` retient qu'un palier est revenu vide : sans lui, la
  // sentinelle redemanderait indefiniment la meme page inexistante.
  const [ajoutees, setAjoutees] = useState<PromptCard[]>([]);
  const [page, setPage] = useState(1);
  const [charge, setCharge] = useState(false);
  const [fini, setFini] = useState(false);

  const toutes = useMemo(() => [...prompts, ...ajoutees], [ajoutees, prompts]);

  const allonger = useCallback(() => {
    setMontrees((n) => n + PALIER);

    // Le palier suivant est demande avant d'en avoir besoin : quand ce
    // qu'on montre approche de ce qu'on a, pas quand il n'y a plus rien.
    if (!chargerLaSuite || charge || fini) return;
    if (montrees + PALIER < toutes.length) return;

    setCharge(true);
    const suivante = page + 1;
    void chargerLaSuite(suivante)
      .then((cartes) => {
        setPage(suivante);
        if (cartes.length === 0) {
          setFini(true);
          return;
        }
        // Le vivier initial et les paliers suivants viennent de deux
        // requetes differentes : une carte peut se retrouver dans les deux.
        // La montrer deux fois donnerait une galerie qui begaie.
        setAjoutees((actuelles) => {
          const vues = new Set([...prompts, ...actuelles].map((carte) => carte.id));
          return [...actuelles, ...cartes.filter((carte) => !vues.has(carte.id))];
        });
      })
      .catch(() => setFini(true))
      .finally(() => setCharge(false));
  }, [charge, chargerLaSuite, fini, montrees, page, prompts, toutes.length]);

  const ouvrir = useCallback(
    (prompt: PromptCard) => {
      if (visiteur && locked && !prompt.isFree) {
        openPaywall();
        return;
      }
      setSelection(prompt);
      if (!visiteur) void trackPromptView(prompt.id);
    },
    [locked, visiteur],
  );

  if (prompts.length === 0) return null;

  const retenues = appliquerLesFiltres(toutes, filtres);
  const visibles = retenues.slice(0, montrees);

  return (
    <>
      {filtrable ? (
        <FiltresDeGalerie
          valeurs={filtres}
          onChange={(valeurs) => {
            setFiltres(valeurs);
            // Le palier revient au debut : rester au quatrieme palier d'une
            // liste qui n'est plus la meme laisse devant des cartes qu'on n'a
            // pas fait defiler.
            setMontrees(PALIER);
          }}
        />
      ) : null}

      {retenues.length === 0 ? (
        <p className="py-6 text-center text-[length:var(--texte-carte)] text-[color:var(--color-muted)]">
          Aucun résultat. Essayez un autre mot ou retirez un filtre.
        </p>
      ) : null}

      <Blocs
        cartes={visibles}
        intercalaires={intercalaires}
        locked={locked}
        visiteur={visiteur}
        provider={provider}
        rayons={rayons}
        ouvrir={ouvrir}
      />

      {montrees < retenues.length || (chargerLaSuite && !fini) ? (
        <Sentinelle onVisible={allonger} libelle="Voir plus d’idées" />
      ) : null}

      {selection ? (
        <PromptDetailSheet
          prompt={selection}
          provider={provider}
          onProviderChange={changeProvider}
          locked={locked && !selection.isFree}
          free={locked && selection.isFree}
          visiteur={visiteur}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </>
  );
}

/**
 * Le feed, rendu bloc par bloc.
 *
 * Les modes et les parcours prenaient la rangee entiere a l'interieur de la
 * grille a deux colonnes. Une carte large au milieu d'une grille decale toute
 * la suite d'un cran : une colonne orpheline a gauche, puis a droite, et un
 * trou a chaque module. L'ordre visuel cessait aussi de suivre l'ordre du
 * document, donc la tabulation sautait d'un bord a l'autre de l'ecran.
 *
 * Chaque bloc est desormais sa propre grille, et un module sa propre ligne.
 * Rien ne se decale, et le clavier suit l'oeil.
 */
function Blocs({
  cartes,
  intercalaires,
  locked,
  visiteur,
  provider,
  rayons,
  ouvrir,
}: {
  cartes: PromptCard[];
  intercalaires: Intercalaire[];
  locked: boolean;
  visiteur: boolean;
  provider: string;
  rayons?: Record<string, string>;
  ouvrir: (prompt: PromptCard) => void;
}) {
  const blocs = useMemo(() => decouperLeFeed(cartes), [cartes]);

  return (
    <div className="flex flex-col gap-2 min-[400px]:gap-[var(--gouttiere-carte)]">
      {blocs.map((bloc) => {
        // Les invitations se posent d'apres le rang des cartes reellement
        // affichees, que chaque bloc porte : compter les elements de la liste
        // ferait glisser chaque invitation d'un cran a chaque module.
        const apres = intercalaires.filter(
          (element) => element.apres > bloc.debut && element.apres <= bloc.fin,
        );

        if (bloc.genre === 'module') {
          return (
            <Fragment key={bloc.cle}>
              <TextPromptCard
                prompt={bloc.carte}
                provider={provider}
                locked={locked && !bloc.carte.isFree}
                free={locked && bloc.carte.isFree}
                visiteur={visiteur}
                rayon={bloc.carte.collectionSlug ? rayons?.[bloc.carte.collectionSlug] : undefined}
                onOpen={ouvrir}
                pleineLargeur
              />
              {apres.map((element) => (
                <Fragment key={element.cle}>{element.noeud}</Fragment>
              ))}
            </Fragment>
          );
        }

        return (
          <Fragment key={bloc.cle}>
            <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 min-[400px]:gap-[var(--gouttiere-carte)]">
              {bloc.cartes.map((prompt, rang) => {
                const verrouille = locked && !prompt.isFree;
                return (
                  <ImagePromptCard
                    key={prompt.id}
                    prompt={prompt}
                    provider={provider}
                    locked={verrouille}
                    free={locked && prompt.isFree}
                    masque={visiteur && verrouille}
                    visiteur={visiteur}
                    rayon={prompt.collectionSlug ? rayons?.[prompt.collectionSlug] : undefined}
                    onOpen={ouvrir}
                    // Les quatre premieres vignettes seulement : sur deux
                    // colonnes, un telephone en montre deux rangees avant le
                    // premier defilement.
                    priority={bloc.debut + rang < 4}
                  />
                );
              })}
            </div>

            {/* Une invitation ferme un bloc, elle ne s'y glisse pas : posee
                dans la grille, elle en decalerait la derniere rangee. */}
            {apres.map((element) => (
              <Fragment key={element.cle}>{element.noeud}</Fragment>
            ))}
          </Fragment>
        );
      })}
    </div>
  );
}
