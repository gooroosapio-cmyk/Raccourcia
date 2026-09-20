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
import { BoutonJaime } from '@/components/cards/bouton-jaime';
import { usePreferredProvider } from '@/lib/catalog/use-preferred-provider';
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
  const [provider, changeProvider] = usePreferredProvider('chatgpt');
  const zone = useRef<HTMLDivElement>(null);

  const allonger = useCallback(() => {
    if (!curseur || charge) return;
    setCharge(true);
    void chargerLaSuite(curseur.image, curseur.texte)
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
          <Sentinelle onVisible={allonger} libelle="Voir la suite" racine={zone} charge={charge} />
        ) : (
          <p className="px-5 py-6 text-center text-[length:var(--texte-carte)] text-[color:var(--color-muted)]">
            Vous avez tout vu.
          </p>
        )}
      </div>

      {fiche ? (
        <PromptDetailSheet
          prompt={fiche}
          provider={provider}
          onProviderChange={changeProvider}
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
  const illustree = carte.genre === 'image' && carte.visuelUrl !== '';

  // Toucher l'image ouvre la fiche. C'est ce qu'on essaie d'abord : on
  // regarde un resultat, on veut le faire. Le bouton du bas reste — il
  // nomme l'action — mais il ne doit plus etre le seul chemin.
  const ouvrir = () => {
    if (!ouverture) onUtiliser(carte);
  };

  return (
    // UNE COLONNE, ET NON UNE PILE DE COUCHES.
    //
    // Sur une carte illustree, l'image remplit le cadre et les informations
    // se posent dessus : c'est le propre d'une photo plein ecran. Sur une
    // carte ECRITE, il n'y a pas de photo — il y a deux textes, et deux
    // textes superposes ne se lisent ni l'un ni l'autre. Le second cas est
    // donc rendu en flux : le texte prend la place qui reste, les
    // informations gardent la leur, et aucune reserve en pourcentage n'a
    // plus a deviner la hauteur de l'autre.
    <article
      className={`relative w-full snap-start overflow-hidden bg-[#0b1220] ${
        illustree ? 'h-full' : 'flex h-full flex-col'
      }`}
    >
      {/* La couche qui recoit le toucher. Posee sous les informations, donc
          un doigt sur un tag, sur le coeur ou sur le rail des voisines
          touche ce qu'il vise ; partout ailleurs, il ouvre la fiche. */}
      <button
        type="button"
        onClick={ouvrir}
        disabled={ouverture}
        aria-label={`Ouvrir ${carte.name}`}
        className={`absolute inset-0 z-0 ${illustree ? '' : 'pointer-events-none'}`}
      />

      {illustree ? (
        <>
          {/* 1. Le fond. Agrandi au-dela du cadre : un flou laisse sinon
              apparaitre les bords transparents de sa propre image. */}
          <Image
            src={carte.visuelUrl}
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            priority={prioritaire}
            className="scale-125 object-cover blur-2xl brightness-[0.45] saturate-150"
          />

          {/* 2. Le visuel, entier. `contain` et non `cover` : cette page
              montre ce que la commande produit, la recadrer reviendrait a le
              montrer faux. */}
          <Image
            src={carte.visuelUrl}
            alt={carte.visuelAlt}
            fill
            sizes="100vw"
            priority={prioritaire}
            className="object-contain"
          />
        </>
      ) : (
        <CarteEcrite carte={carte} />
      )}

      {/* 3. Le fondu, sous les informations posees sur l'image. Une carte
          ecrite n'en a pas besoin : son fond est deja sombre, et sa zone
          basse ne recouvre rien. */}
      {illustree ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/75 to-transparent"
        />
      ) : null}

      {/* 4. Les informations. Posees sur l'image, ou a la suite du texte. */}
      <div
        className={`px-5 pb-5 pt-4 text-white ${
          illustree ? 'absolute inset-x-0 bottom-0' : 'relative shrink-0 bg-black/25'
        }`}
      >
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
            <button
              type="button"
              onClick={() => onUtiliser(carte)}
              disabled={ouverture}
              className="block text-left"
            >
              <h2 className="text-[19px] font-bold leading-tight">{carte.name}</h2>
              <p className="mt-0.5 font-mono text-[13px] text-white/70">{carte.command}</p>
            </button>

            {carte.description ? (
              <p className="mt-1.5 line-clamp-2 text-[length:var(--texte-carte)] leading-snug text-white/85">
                {carte.description}
              </p>
            ) : null}

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
                      href={`/app/bibliotheque/tag/${tag.slug}`}
                      className="relative inline-flex min-h-[30px] items-center rounded-full border border-white/25 px-2.5 text-[12px] font-medium text-white/85 after:absolute after:-inset-y-[7px] after:inset-x-0 after:content-['']"
                    >
                      {tag.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <BoutonJaime
            promptId={carte.id}
            likeCount={carte.likeCount}
            aime={carte.aime}
            visiteur={visiteur}
            surVisuel
          />
        </div>

        {/* LE GESTE LATERAL : LA MEME COLLECTION.
            Le feed descend au hasard — c'est sa promesse, et sa limite.
            Tomber sur un portrait vintage qui plait sans pouvoir en voir
            d'autres du meme genre obligeait a fermer la page, a chercher le
            rayon, puis a recommencer. A droite, ses voisines. */}
        {carte.voisines.length > 0 ? (
          <RailDeCollection carte={carte} onUtiliser={onUtiliser} />
        ) : null}

        <button
          type="button"
          onClick={() => onUtiliser(carte)}
          disabled={ouverture}
          // Le geste attendu de cette page, et il ouvre la fiche de la
          // commande regardee — pas l'accueil, ou il faudrait la retrouver.
          className="touch-target mt-3.5 flex w-full items-center justify-center rounded-[color:var(--radius-control)] bg-white px-4 text-[15px] font-semibold text-[color:var(--color-night)] transition-opacity duration-[var(--duration-fast)] disabled:opacity-60"
        >
          {ouverture ? 'Ouverture…' : reserve ? 'Voir cette commande' : 'Utiliser cette commande'}
        </button>
      </div>
    </article>
  );
}

/**
 * Les voisines de la carte, en une rangee qui defile.
 *
 * Des vignettes et non des cartes : ce rail sert a choisir, pas a lire.
 * Le nom sous chaque vignette suffit — le reste se decouvre en ouvrant.
 *
 * `snap-start` sur chaque element : le pouce repose la rangee sur une
 * vignette entiere, jamais a cheval sur deux, ce qui evite le sentiment
 * d'une liste qui glisse toute seule.
 */
function RailDeCollection({
  carte,
  onUtiliser,
}: {
  carte: CarteDecouverte;
  onUtiliser: (carte: CarteDecouverte) => void;
}) {
  return (
    <div className="mt-3">
      <p className="text-[length:var(--texte-meta)] font-medium text-white/70">
        {carte.collection ? `Dans ${carte.collection.nom}` : 'Dans la même collection'}
      </p>

      <ul className="rail -mx-5 mt-1.5 flex snap-x snap-mandatory gap-2 px-5 pb-0.5">
        {carte.voisines.map((voisine) => (
          <li key={voisine.id} className="w-[74px] shrink-0 snap-start">
            <button
              type="button"
              // La voisine emprunte l'ouverture de la carte courante : le
              // feed ne connait qu'un chemin vers une fiche, et en ouvrir
              // un second ici ferait diverger les deux le jour ou l'un
              // change.
              onClick={() =>
                onUtiliser({
                  ...carte,
                  id: voisine.id,
                  slug: voisine.slug,
                  isFree: voisine.isFree,
                })
              }
              className="block w-full text-left"
            >
              <span className="relative block aspect-square w-full overflow-hidden rounded-[10px] border border-white/20">
                <Image
                  src={voisine.visuelUrl}
                  alt={voisine.visuelAlt}
                  fill
                  sizes="74px"
                  className="object-cover"
                />
              </span>
              <span className="mt-1 block truncate text-[11px] leading-tight text-white/75">
                {voisine.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Une commande qui n'a pas d'image a montrer.
 *
 * Un tiers du catalogue redige, analyse ou converse. Ces commandes n'ont
 * pas de resultat visuel, et leur en inventer un — une illustration
 * generique, un degrade avec un nom dessus — reviendrait a promettre une
 * image la ou il n'y en aura pas.
 *
 * Ce qu'elles ont a la place, c'est ce qu'elles font. On l'ecrit donc, en
 * grand, sur une surface qui se reconnait au premier coup d'oeil comme
 * n'etant pas une photo : c'est l'equivalent de l'image pour une commande
 * de texte, pas un cadre vide en attendant mieux.
 *
 * La teinte vient du nom de la commande : deux cartes voisines ne se
 * ressemblent pas, et une meme carte garde sa couleur d'un passage a
 * l'autre.
 */
function CarteEcrite({ carte }: { carte: CarteDecouverte }) {
  const teinte = teinteDe(carte.command);

  return (
    <div
      // LE TEXTE NE PEUT PLUS PASSER SOUS LA ZONE D'INFORMATION.
      //
      // Il etait centre dans le cadre entier, puis borne par une reserve en
      // pourcentage — 42 %, puis 58 %. Un pourcentage est une estimation de
      // la hauteur de l'autre bloc : il tombe juste sur la carte qui a servi
      // a le regler, trop court des qu'une carte porte trois tags, trop
      // large des qu'elle n'en porte aucun.
      //
      // Il n'y a plus de reserve. Le bloc prend ce que la colonne lui
      // laisse — `flex-1`, `min-h-0` pour qu'il accepte de retrecir — et la
      // zone basse garde exactement la place qu'elle occupe. Les deux ne
      // peuvent plus se croiser, quelle que soit la longueur du texte.
      className="flex min-h-0 flex-1 flex-col justify-start overflow-hidden px-6 pb-6 pt-14"
      style={{
        background: `linear-gradient(155deg, ${teinte.haut} 0%, ${teinte.bas} 100%)`,
      }}
    >
      {carte.bibliotheque ? (
        <p className="text-[length:var(--texte-meta)] font-semibold uppercase tracking-[0.12em] text-white/70">
          {carte.bibliotheque}
        </p>
      ) : null}

      {/* Le detail, et non la description courte : c'est le contenu de la
          carte, donc il prend la place qu'aurait eue l'image. */}
      <p className="mt-3 line-clamp-6 text-[19px] font-medium leading-[1.45] text-white">
        {carte.detail || carte.description}
      </p>
    </div>
  );
}

/**
 * Deux teintes sombres tirees du nom de la commande.
 *
 * Sombres, parce que le texte de la zone basse se pose dessus en blanc.
 * Tirees du nom, parce qu'un tirage au sort changerait de couleur a chaque
 * rechargement — ce qui se lit comme un defaut d'affichage, pas comme une
 * variete.
 */
function teinteDe(commande: string): { haut: string; bas: string } {
  let empreinte = 0;
  for (const caractere of commande) {
    empreinte = (empreinte * 31 + caractere.charCodeAt(0)) % 360;
  }
  return {
    haut: `hsl(${empreinte} 46% 32%)`,
    bas: `hsl(${(empreinte + 38) % 360} 52% 16%)`,
  };
}
