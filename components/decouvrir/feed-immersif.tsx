'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { PromptDetailSheet } from '@/components/detail/prompt-detail';
import { Sentinelle } from '@/components/feed/sentinelle';
import { openPaywall } from '@/components/paywall/paywall-provider';
import { showToast } from '@/components/ui/toast';
import { chargerLaSuite, ouvrirLaFiche } from '@/lib/actions/decouverte';
import { trackPromptView } from '@/lib/actions/catalog';
import { FavoriteButton } from '@/components/cards/favorite-button';
import type { CarteDecouverte, CurseurDecouverte, PromptCard } from '@/lib/catalog/types';

/**
 * Decouvrir : le catalogue par ce qu'il produit.
 *
 * Une carte, un ecran. Ailleurs on lit des noms de commandes ; ici on ne voit
 * que des resultats, et le nom ne vient qu'apres, pour dire lequel les a
 * faits. C'est l'inverse de la Bibliotheque, et c'est voulu : « /goldenselfie »
 * ne fait choisir personne, le selfie dore si.
 *
 * LE DEFILEMENT A SA PROPRE ZONE, pas celle de la page. Un feed plein ecran
 * qui pousse l'en-tete collant et la barre basse hors de vue rend l'ecran
 * impossible a quitter autrement qu'en remontant tout. La zone garde ses deux
 * bords, et l'aimantation verticale fait le reste : une carte se pose toujours
 * entiere.
 *
 * `overscroll-contain` empeche le geste de se propager a la page une fois le
 * bas atteint — sans quoi le navigateur mobile declenche son rafraichissement
 * par traction au milieu d'une lecture.
 */
export function FeedImmersif({
  initiales,
  suite,
  locked,
  visiteur,
}: {
  initiales: CarteDecouverte[];
  suite: CurseurDecouverte | null;
  /** Vrai tant que l'acces a vie n'est pas actif. */
  locked: boolean;
  /** Vrai quand personne n'est connecte. */
  visiteur: boolean;
}) {
  const [cartes, setCartes] = useState(initiales);
  const [curseur, setCurseur] = useState(suite);
  const [charge, setCharge] = useState(false);
  const [fiche, setFiche] = useState<PromptCard | null>(null);
  const [ouverture, setOuverture] = useState<string | null>(null);
  const zone = useRef<HTMLDivElement>(null);

  const allonger = useCallback(() => {
    if (!curseur || charge) return;
    setCharge(true);
    void chargerLaSuite(curseur)
      .then((page) => {
        // Concatenation et non remplacement : le palier precedent reste a
        // l'ecran, donc la position de lecture ne bouge pas.
        setCartes((actuelles) => [...actuelles, ...page.cartes]);
        setCurseur(page.suite);
      })
      .catch(() => {
        // Un palier qui n'arrive pas n'est pas une fin de liste : le curseur
        // reste en place et la sentinelle redemandera au geste suivant.
        showToast('La suite n’a pas pu être chargée.', 'erreur');
      })
      .finally(() => setCharge(false));
  }, [charge, curseur]);

  const utiliser = useCallback(
    (carte: CarteDecouverte) => {
      // Un visiteur devant une commande reservee voit l'offre, pas une fiche
      // verrouillee : il n'a pas de compte a qui la rattacher.
      if (visiteur && locked && !carte.isFree) {
        openPaywall();
        return;
      }

      setOuverture(carte.id);
      void ouvrirLaFiche(carte.slug)
        .then((detail) => {
          if (!detail) {
            showToast('Cette commande n’est plus disponible.', 'erreur');
            return;
          }
          setFiche(detail);
          if (!visiteur) void trackPromptView(detail.id);
        })
        .catch(() => showToast('La fiche n’a pas pu être ouverte.', 'erreur'))
        .finally(() => setOuverture(null));
    },
    [locked, visiteur],
  );

  return (
    <>
      <div
        ref={zone}
        // PLEIN ECRAN MOINS LA SEULE BARRE QUI RESTE.
        //
        // L'en-tete a disparu sous cette page : la carte prend donc toute
        // la hauteur sauf la barre basse, qui est le seul moyen d'en
        // sortir. Retirer aussi celle-la enfermerait dans le feed.
        //
        // `une-carte-a-la-fois` pose `scroll-snap-stop: always` sur chaque
        // carte : `snap-mandatory` seul replace bien la carte, mais un
        // geste ample en traverse trois d'un coup et l'on arrive quatre
        // cartes plus loin sans avoir vu les deux du milieu.
        className="une-carte-a-la-fois h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] snap-y snap-mandatory overflow-y-auto overscroll-contain"
      >
        {cartes.map((carte, rang) => (
          <CarteImmersive
            key={carte.id}
            carte={carte}
            // Les deux premieres : la seconde est deja a moitie chargee quand
            // le premier geste l'amene.
            prioritaire={rang < 2}
            reserve={locked && !carte.isFree}
            visiteur={visiteur}
            ouverture={ouverture === carte.id}
            onUtiliser={utiliser}
          />
        ))}

        {curseur ? (
          <Sentinelle
            onVisible={allonger}
            libelle="Voir la suite"
            racine={zone}
            charge={charge}
            // Une carte occupe l'ecran : une hauteur d'avance ne vaudrait
            // qu'une carte de reserve, et le geste suivant buterait sur du
            // vide. Trois cartes laissent le temps d'un aller-retour.
            avance={3}
          />
        ) : (
          <p className="px-5 py-6 text-center text-[length:var(--texte-carte)] text-[color:var(--color-muted)]">
            Vous avez tout vu.
          </p>
        )}
      </div>

      {fiche ? (
        <PromptDetailSheet
          prompt={fiche}
          locked={locked && !fiche.isFree}
          free={locked && fiche.isFree}
          visiteur={visiteur}
          onClose={() => setFiche(null)}
        />
      ) : null}
    </>
  );
}

/**
 * Une carte, un ecran, quatre couches.
 *
 * Les visuels du catalogue n'ont pas tous le meme format : du 4:5 vertical,
 * du 16:9, du carre. Les recadrer au format de l'ecran couperait la moitie
 * d'un portrait ou les bords d'une affiche — c'est-a-dire precisement ce que
 * la commande a produit. Les poser en entier sur du noir laisserait deux
 * bandes vides sur la plupart d'entre eux.
 *
 * D'ou quatre couches :
 *   1. le meme visuel, agrandi et floute, qui remplit le cadre ;
 *   2. le visuel entier, ajuste, jamais coupe ;
 *   3. un fondu sombre qui monte du bas ;
 *   4. les informations, posees sur ce fondu.
 *
 * Le fond est tire de l'image elle-meme et non d'une couleur choisie : les
 * teintes s'accordent toujours, et le navigateur ne telecharge qu'un fichier
 * — c'est deux fois la meme adresse.
 */
function CarteImmersive({
  carte,
  prioritaire,
  reserve,
  visiteur,
  ouverture,
  onUtiliser,
}: {
  carte: CarteDecouverte;
  prioritaire: boolean;
  /** Vrai quand la commande demande l'acces a vie. */
  reserve: boolean;
  visiteur: boolean;
  /** Vrai pendant que la fiche se charge. */
  ouverture: boolean;
  onUtiliser: (carte: CarteDecouverte) => void;
}) {
  // Toucher l'image ouvre la fiche. C'est ce qu'on essaie d'abord : on
  // regarde un resultat, on veut le faire. Le bouton du bas reste — il
  // nomme l'action — mais il ne doit plus etre le seul chemin.
  const ouvrir = () => {
    if (!ouverture) onUtiliser(carte);
  };

  return (
    // UNE PILE DE COUCHES : l'image remplit le cadre, les informations se
    // posent dessus. C'est le propre d'une photo plein ecran, et c'est le
    // seul cas qui existe ici — le feed ne montre plus que des visuels.
    <article className="relative h-full w-full snap-start overflow-hidden bg-[#0b1220]">
      {/* La couche qui recoit le toucher. Posee sous les informations, donc
          un doigt sur un tag, sur le coeur ou sur le rail des voisines
          touche ce qu'il vise ; partout ailleurs, il ouvre la fiche. */}
      <button
        type="button"
        onClick={ouvrir}
        disabled={ouverture}
        // Hors du parcours au clavier : le titre, plus bas, porte la meme
        // action et l'annonce. Deux cibles pour un geste se liraient deux fois.
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 z-0"
      />

      {/* 1. Le fond. Agrandi au-dela du cadre : un flou laisse sinon
          apparaitre les bords transparents de sa propre image. */}
      <Image
        src={carte.visuelUrl}
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        priority={prioritaire}
        className="scale-125 object-cover object-top blur-2xl brightness-[0.45] saturate-150"
      />

      {/* 2. Le visuel, entier. `contain` et non `cover` : cette page montre
          ce que la commande produit, la recadrer reviendrait a le montrer
          faux.

          ANCRE EN HAUT, ET NON CENTRE. `object-contain` posait l'image au
          milieu du cadre : un portrait 4:5 sur un telephone 9:19,5 laissait
          alors une bande noire de deux cents pixels AU-DESSUS, pendant que
          le bas de la meme image passait derriere le bloc d'informations.
          Le vide etait en haut, le contenu cache en bas — les deux se
          corrigent du meme geste.

          `object-top` place la marge restante entierement sous l'image,
          c'est-a-dire exactement la ou le fondu et les informations se
          posent. Rien n'est recadre : l'image garde ses proportions, elle
          change seulement de place dans le cadre. */}
      <Image
        src={carte.visuelUrl}
        alt={carte.visuelAlt}
        fill
        sizes="100vw"
        priority={prioritaire}
        className="object-contain object-top"
      />

      {/* 3. Le fondu, sous les informations posees sur l'image. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/75 to-transparent"
      />

      {/* 4. Les informations, posees sur l'image. */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-4 text-white">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            {carte.isFree ? (
              <span className="mb-2 inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur">
                Offert
              </span>
            ) : null}

            {/* Le nom ouvre la fiche, comme le bouton du bas. On touche
                naturellement ce qu'on lit ; n'avoir que le bouton obligeait
                a viser plus bas ce qu'on avait deja designe du doigt. */}
            {/* Le titre et la description ouvrent la fiche (rapport de
                refonte) : on touche ce qu'on lit. Pas de /commande ici —
                elle vit dans les details de la fiche. */}
            <button
              type="button"
              onClick={() => onUtiliser(carte)}
              disabled={ouverture}
              aria-label={`Voir la commande ${carte.name}`}
              className="block min-h-11 text-left"
            >
              <h2 className="text-[19px] font-bold leading-tight">{carte.name}</h2>
              {carte.description ? (
                <p className="mt-1.5 line-clamp-2 text-[length:var(--texte-carte)] leading-snug text-white/85">
                  {carte.description}
                </p>
              ) : null}
            </button>

            {/* Les tags sont des sorties : « pas celle-la, mais quelque
                chose de ce genre » se joue ici, et non en remontant tout le
                feed. */}
            {carte.tags.length > 0 ? (
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {carte.tags.map((tag) => (
                  <li key={tag.slug}>
                    {/* La pastille reste fine, la zone de frappe fait
                        44 px : trois pastilles a 44 px de haut mangeraient
                        la zone d'information, et une pastille de 30 px se
                        manque au pouce. Le pseudo-element etend la cible
                        sans toucher au dessin. */}
                    <Link
                      // Un #tag ouvre les resultats filtres dans Visuels.
                      href={`/app?bibliotheque=images&tags=${encodeURIComponent(tag.slug)}`}
                      className="relative inline-flex min-h-[30px] items-center rounded-full border border-white/25 px-2.5 text-[12px] font-medium text-white/85 after:absolute after:-inset-y-[7px] after:inset-x-0 after:content-['']"
                    >
                      #{tag.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1">
            <FavoriteButton
              promptId={carte.id}
              initial={carte.isFavorite}
              disabled={reserve}
              visiteur={visiteur}
              surVisuel
            />
            <BoutonPartage carte={carte} />
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Partager : le lien canonique de la fiche, jamais le texte de la commande.
 *
 * Le partage natif quand le telephone l'offre ; sinon le lien part au
 * presse-papiers, et un toast le confirme seulement si l'ecriture a reussi.
 */
function BoutonPartage({ carte }: { carte: CarteDecouverte }) {
  const partager = async () => {
    const url = `${window.location.origin}/r/${carte.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: carte.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast('Lien copié');
    } catch {
      // Un partage annule n'est pas une erreur a signaler.
    }
  };

  return (
    <button
      type="button"
      onClick={() => void partager()}
      aria-label={`Partager ${carte.name}`}
      className="touch-target inline-flex items-center justify-center rounded-full text-white"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 15V4m0 0L8 8m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
