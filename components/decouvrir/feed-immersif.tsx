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
import { basculerLeLike } from '@/lib/actions/likes';
import { usePreferredProvider } from '@/lib/catalog/use-preferred-provider';
import { compteCourt } from '@/lib/format/nombre';
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
    void chargerLaSuite(curseur.rang, curseur.id)
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
        // Hauteur de l'ecran moins l'en-tete et la barre basse : la carte
        // occupe tout ce qui reste, et rien de plus. Les deux reperes de
        // navigation restent donc visibles pendant toute la lecture.
        className="h-[calc(100dvh-7.25rem-env(safe-area-inset-bottom))] snap-y snap-mandatory overflow-y-auto overscroll-contain"
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
          <Sentinelle onVisible={allonger} libelle="Voir la suite" racine={zone} />
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
  return (
    <article className="relative h-full w-full snap-start overflow-hidden bg-[#0b1220]">
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

      {/* 2. Le visuel, entier. `contain` et non `cover` : cette page montre ce
          que la commande produit, la recadrer reviendrait a le montrer faux. */}
      <Image
        src={carte.visuelUrl}
        alt={carte.visuelAlt}
        fill
        sizes="100vw"
        priority={prioritaire}
        className="object-contain"
      />

      {/* 3. Le fondu. Opaque en bas, nul a mi-hauteur : le texte se lit quel
          que soit le visuel dessous, sans le masquer. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/75 to-transparent"
      />

      {/* 4. Les informations. */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-4 text-white">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            {carte.isFree ? (
              <span className="mb-2 inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur">
                Offert
              </span>
            ) : null}

            <h2 className="text-[19px] font-bold leading-tight">{carte.name}</h2>

            <p className="mt-0.5 font-mono text-[13px] text-white/70">{carte.command}</p>

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
                    <Link
                      href={`/app/bibliotheque/tag/${tag.slug}`}
                      className="inline-flex min-h-[30px] items-center rounded-full border border-white/25 px-2.5 text-[12px] font-medium text-white/85"
                    >
                      {tag.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <BoutonJaime carte={carte} visiteur={visiteur} />
        </div>

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
 * Le cœur, et son compteur.
 *
 * Le compteur n'apparait qu'a partir de deux. « 1 » sous un cœur ne dit rien
 * d'autre que « quelqu'un a clique », et sur un catalogue qui vient d'ouvrir
 * il afficherait surtout la solitude de chaque carte. A partir de deux, le
 * chiffre devient une information.
 *
 * L'etat bascule avant la reponse du serveur : un cœur qui attend un
 * aller-retour donne l'impression de ne pas avoir compris le geste. Il revient
 * en arriere si l'ecriture echoue, et le total affiche est alors celui que la
 * base a reellement compte.
 */
function BoutonJaime({ carte, visiteur }: { carte: CarteDecouverte; visiteur: boolean }) {
  const [aime, setAime] = useState(carte.aime);
  const [total, setTotal] = useState(carte.likeCount);
  const [envoi, setEnvoi] = useState(false);

  const basculer = () => {
    if (envoi) return;

    // Un visiteur ne peut pas aimer : la politique de la table le refuse, et
    // fabriquer un like d'appareil reviendrait a compter les navigateurs.
    if (visiteur) {
      showToast('Connectez-vous pour aimer une commande.', 'erreur');
      return;
    }

    const vise = !aime;
    setAime(vise);
    setTotal((n) => Math.max(0, n + (vise ? 1 : -1)));
    setEnvoi(true);

    void basculerLeLike(carte.id, vise)
      .then((etat) => {
        if (etat.ok) {
          setAime(etat.aime);
          setTotal(etat.total);
          return;
        }
        setAime(!vise);
        setTotal(carte.likeCount);
        showToast(
          etat.raison === 'connexion'
            ? 'Connectez-vous pour aimer une commande.'
            : 'Votre « j’aime » n’a pas été enregistré.',
          'erreur',
        );
      })
      .catch(() => {
        setAime(!vise);
        setTotal(carte.likeCount);
        showToast('Votre « j’aime » n’a pas été enregistré.', 'erreur');
      })
      .finally(() => setEnvoi(false));
  };

  return (
    <button
      type="button"
      onClick={basculer}
      aria-pressed={aime}
      aria-label={aime ? 'Retirer mon « j’aime »' : 'Aimer cette commande'}
      className="flex min-h-[44px] min-w-[44px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-white"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 0 1 19.4 13Z"
          fill={aime ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          className={
            aime
              ? 'text-[color:var(--color-brand)] transition-transform duration-[var(--duration-fast)]'
              : 'transition-transform duration-[var(--duration-fast)]'
          }
        />
      </svg>
      {total >= 2 ? (
        <span className="text-[12px] font-semibold tabular-nums">{compteCourt(total)}</span>
      ) : null}
    </button>
  );
}
