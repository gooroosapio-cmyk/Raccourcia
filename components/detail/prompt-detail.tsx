'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessBadge } from '@/components/cards/access-badge';
import { AvertissementResultats } from '@/components/detail/avertissement-resultats';
import { BeforeAfterMedia, MediaPlaceholder } from '@/components/media/before-after-media';
import { ChampsDeCommande } from '@/components/detail/champs-de-commande';
import { CopyCommandButton } from '@/components/cards/copy-command-button';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { AFournir } from '@/components/detail/a-fournir';
import { CorpsMode, CorpsParcours } from '@/components/detail/fiche-moteur';
import { ModesCommande } from '@/components/detail/modes-commande';
import { MotsCles } from '@/components/detail/mots-cles';
import { FilTaxonomique } from '@/components/detail/fil-taxonomique';
import { CopieDuRaccourci } from '@/components/detail/copie-du-raccourci';
import { VousObtenez } from '@/components/detail/vous-obtenez';
import { ListePuces, Section } from '@/components/detail/section-fiche';
import { NiveauExecution } from '@/components/detail/niveau-execution';
import { SheetCloseButton } from '@/components/ui/sheet-close';
import { ApercuDuPrompt } from '@/components/detail/apercu-du-prompt';
import { Icone } from '@/components/ui/icone';
import { iconeDuRole } from '@/lib/ui/icones';
import { SheetDragHandle, useSheetDrag } from '@/components/ui/sheet-drag';
import { usePaywall } from '@/components/paywall/paywall-provider';
import { decrireNiveau } from '@/lib/catalog/niveau';
import { texteDePartage } from '@/lib/share/texte-de-partage';
import { useToast } from '@/components/ui/toast';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Fiche d'une commande : comprendre, completer, copier.
 *
 * Le detail reste une couche par-dessus la grille : la fermer rend la
 * position de defilement et les filtres exactement tels qu'ils etaient.
 *
 * L'ORDRE DU RAPPORT DE REFONTE (23 septembre 2026) :
 *   1. le titre entier et le benefice en une phrase ;
 *   2. le media (avant/apres) quand la commande rend une image ;
 *   3. « A completer », ouvert, juste apres le resume ;
 *   4. la consigne de photo, quand la commande part d'une image ;
 *   5. « Voir le prompt final », replie ;
 *   6. les details — dont le raccourci /commande, devenu secondaire ;
 *   7. l'avertissement, en fin de contenu.
 * La barre « Copier le prompt » reste fixe en bas et remplace la
 * navigation, que la fiche recouvre.
 *
 * Sur ordinateur, deux panneaux : le media a gauche, le texte et les champs
 * a droite. Une commande sans media garde une seule colonne centree.
 *
 * Le texte complet n'est jamais embarque : l'apercu et la copie le
 * demandent a la route de lecture, qui revalide l'acces.
 */
export function PromptDetailSheet({
  prompt,
  locked,
  free,
  visiteur = false,
  onClose,
}: {
  prompt: PromptCard;
  locked: boolean;
  free: boolean;
  /**
   * Vrai quand personne n'est connecte. Un visiteur n'atteint cette fiche que
   * sur une commande offerte : il peut la lire et la copier, mais ni la
   * mettre en favori — il n'a pas de bibliotheque — ni partager un lien qui
   * ne mene nulle part pour lui.
   */
  visiteur?: boolean;
  onClose: () => void;
}) {
  const { open: ouvrirOffre } = usePaywall();
  const { show } = useToast();
  const fermerRef = useRef<HTMLButtonElement>(null);
  const panneauRef = useRef<HTMLDivElement>(null);
  const contenuRef = useRef<HTMLDivElement>(null);
  const [agrandi, setAgrandi] = useState(false);

  // Ce que le formulaire a recueilli, quand la commande en demande.
  //
  // L'etat vit ici et non dans le formulaire : le bouton de copie est dans
  // le pied de la fiche, a l'autre bout de l'arbre, et c'est lui qui envoie.
  // Il se perd a la fermeture, comme le reste de la fiche — une saisie
  // retenue d'une ouverture a l'autre ferait copier, sans le dire, des
  // valeurs posees pour une autre occasion.
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  const renseigner = useCallback((cle: string, valeur: string) => {
    setValeurs((actuelles) => ({ ...actuelles, [cle]: valeur }));
    // L'erreur tombe des qu'on corrige : la garder rouge pendant la saisie
    // reprocherait ce qu'on est en train de faire.
    setErreurs((actuelles) => {
      if (!actuelles[cle]) return actuelles;
      const suite = { ...actuelles };
      delete suite[cle];
      return suite;
    });
  }, []);

  // Un champ indispensable vide arrete la copie : le message se pose sous
  // le champ, et le focus y va. Les champs facultatifs ne bloquent jamais.
  const verifierAvantCopie = useCallback(() => {
    const manquants = prompt.champs.filter(
      (champ) => champ.requis && !(valeurs[champ.cle] ?? '').trim(),
    );
    if (manquants.length === 0) return true;
    setErreurs(
      Object.fromEntries(manquants.map((champ) => [champ.cle, 'À renseigner avant de copier.'])),
    );
    document.getElementById(`champ-${manquants[0]!.cle}`)?.focus();
    return false;
  }, [prompt.champs, valeurs]);

  // Seules les clefs declarees partent, et dans l'ordre du formulaire : le
  // serveur les reverifiera, mais rien ne sert d'envoyer ce qu'il ecartera.
  const saisies = useMemo(
    () =>
      prompt.champs
        .map((champ) => ({ cle: champ.cle, valeur: valeurs[champ.cle] ?? '' }))
        .filter((champ) => champ.valeur !== ''),
    [prompt.champs, valeurs],
  );
  const glissement = useSheetDrag({ onClose, contenuRef });

  useEffect(() => {
    // L'element qui a ouvert la fiche, pour lui rendre le focus a la
    // fermeture : sans cela le clavier repart du haut de la page et l'on perd
    // sa place dans une grille de trois cents cartes.
    const declencheur = document.activeElement as HTMLElement | null;
    fermerRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Une couche a la fois : l'agrandissement se ferme avant la fiche.
      setAgrandi((ouvert) => {
        if (ouvert) return false;
        onClose();
        return false;
      });
    };
    // Le focus reste dans la fiche : sans cela, la tabulation continue dans
    // la grille derriere, invisible et inutilisable.
    const onTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panneauRef.current) return;
      const cibles = panneauRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (cibles.length === 0) return;
      const premier = cibles[0]!;
      const dernier = cibles[cibles.length - 1]!;
      if (event.shiftKey && document.activeElement === premier) {
        event.preventDefault();
        dernier.focus();
      } else if (!event.shiftKey && document.activeElement === dernier) {
        event.preventDefault();
        premier.focus();
      }
    };

    // Le bouton Retour ferme la fiche au lieu de quitter la bibliotheque :
    // c'est ce que fait une couche sur mobile, et ce que le geste systeme
    // laisse attendre.
    window.history.pushState({ fiche: true }, '');
    const onPop = () => onClose();
    window.addEventListener('popstate', onPop);

    document.addEventListener('keydown', onKey);
    document.addEventListener('keydown', onTab);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keydown', onTab);
      window.removeEventListener('popstate', onPop);
      document.body.style.overflow = '';
      // Le focus retourne d'ou il venait : sur la carte, pas en haut de page.
      declencheur?.focus?.();
    };
  }, [onClose]);

  const niveau = decrireNiveau(prompt.level, prompt.maxQuestions);
  // Le panneau media n'existe que pour une commande qui rend une image.
  const media = prompt.showImageCard;

  const partager = async () => {
    const url = `${window.location.origin}/r/${prompt.slug}`;
    try {
      // Un texte redige, pas la legende du catalogue. Collee dans une
      // conversation, celle-ci arrivait sans nom, sans sujet et sans rien
      // qui dise quoi en faire.
      const texte = texteDePartage(prompt);

      if (navigator.share) {
        await navigator.share({ title: prompt.name, text: texte, url });
        return;
      }
      // Sans partage natif — un navigateur de bureau —, c'est le message
      // ENTIER qui part au presse-papiers, lien compris : copier l'adresse
      // seule obligeait a reecrire a la main ce qu'on vient de composer.
      await navigator.clipboard.writeText(`${texte}\n${url}`);
      show('Message copié');
    } catch {
      // Un partage annule par l'utilisateur n'est pas une erreur a signaler.
    }
  };

  return (
    // La fiche occupe l'ecran entier.
    //
    // Elle s'ouvrait aux neuf dixiemes, sur un fond assombri : une fenetre
    // posee par-dessus la galerie. Ce reste de galerie visible en haut
    // invitait a remonter au lieu de lire, et la fiche est ce qu'on est venu
    // voir — elle porte l'avant/apres, ce qu'il faut fournir, les champs a
    // remplir et le bouton de copie. Elle prend donc toute la place.
    //
    // Elle reste une couche et non une page : la galerie garde sa position
    // de defilement et ses filtres derriere, et refermer rend exactement
    // l'ecran qu'on avait quitte. Le bouton Retour du telephone la referme,
    // comme avant.
    <div className="fixed inset-0 z-50 flex justify-center bg-[color:var(--color-surface)]">
      <div
        ref={panneauRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fiche-commande"
        style={glissement.style}
        className="anim-sheet relative flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden bg-[color:var(--color-surface)] transition-transform duration-[var(--duration-sheet)] ease-[var(--ease-out)] lg:max-w-4xl"
      >
        {/* La zone de prise couvre la poignee et la barre d'actions : c'est la
            qu'un pouce se pose naturellement pour repousser la fiche. */}
        <div {...glissement.poignee} className="shrink-0 touch-none">
          <SheetDragHandle />

          <header className="flex items-center justify-between gap-1 border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-2 py-1.5">
            {/* Retour, et non une croix : on revient a la liste, a sa
                position et a ses filtres — c'est ce que dit une fleche. */}
            <button
              ref={fermerRef}
              type="button"
              onClick={onClose}
              aria-label="Retour"
              className="touch-target inline-flex items-center justify-center rounded-full text-[color:var(--color-night)]"
            >
              <Icone svg={iconeDuRole('back')} taille={24} />
            </button>

            <div className="flex items-center">
              <FavoriteButton
                promptId={prompt.id}
                initial={prompt.isFavorite}
                disabled={locked}
                visiteur={visiteur}
              />
              <button
                type="button"
                onClick={partager}
                aria-label="Partager cette commande"
                className="touch-target inline-flex items-center justify-center rounded-full text-[color:var(--color-muted)]"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 15V4m0 0L8 8m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </header>
        </div>

        <div ref={contenuRef} className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-4">
          <div
            className={
              media
                ? 'flex flex-col lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8'
                : 'mx-auto flex max-w-2xl flex-col'
            }
          >
            {/* 1. Le titre entier et le benefice. */}
            <div className={media ? 'lg:col-start-2 lg:row-start-1' : undefined}>
              <div className="flex items-start justify-between gap-2">
                <FilTaxonomique library={prompt.library} collection={prompt.collectionName} />
                <AccessBadge free={free} locked={locked} isNew={prompt.isNew} />
              </div>
              <h2
                id="fiche-commande"
                className="mt-2 text-[24px] font-semibold leading-tight text-[color:var(--color-night)]"
              >
                {prompt.name}
              </h2>
              <p className="mt-1.5 text-[length:var(--texte-corps)] leading-[1.5] text-[color:var(--color-night)]">
                {prompt.shortDescription || prompt.resultSummary}
              </p>
            </div>

            {/* 2. Le media, compact sur telephone, a gauche sur ordinateur. */}
            {media ? (
              <div className="mt-4 lg:sticky lg:top-0 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0">
                <button
                  type="button"
                  onClick={() => prompt.beforeAfter && setAgrandi(true)}
                  aria-label={
                    prompt.beforeAfter
                      ? 'Agrandir la comparaison avant et après'
                      : 'Aucun visuel disponible'
                  }
                  disabled={!prompt.beforeAfter}
                  className="block w-full"
                >
                  <div
                    className={
                      locked
                        ? 'scale-[1.04] overflow-hidden rounded-[color:var(--radius-card)] blur-[8px]'
                        : undefined
                    }
                  >
                    {prompt.beforeAfter ? (
                      <BeforeAfterMedia media={prompt.beforeAfter} command={prompt.command} />
                    ) : (
                      <MediaPlaceholder command={prompt.command} />
                    )}
                  </div>
                </button>
              </div>
            ) : null}

            <div className={media ? 'lg:col-start-2 lg:row-start-2' : undefined}>
              {/* 3. A completer, ouvert, juste apres le resume. */}
              <ChampsDeCommande
                champs={prompt.champs}
                valeurs={valeurs}
                onChange={renseigner}
                erreurs={erreurs}
                desactive={locked}
              />

              {/* 4. La photo se joint dans l'outil d'IA : aucun televersement
                  ici ne l'alimenterait, et en proposer un serait mentir. */}
              {prompt.entreeImage && prompt.library === 'images' ? (
                <p className="mt-4 flex gap-2 rounded-[color:var(--radius-control)] bg-[color:var(--color-sky)] px-3 py-2.5 text-[length:var(--texte-meta)] leading-snug text-[color:var(--color-night)]">
                  <span aria-hidden="true" className="shrink-0 text-[color:var(--color-brand)]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2.5"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <circle cx="9" cy="10" r="1.8" stroke="currentColor" strokeWidth="2" />
                      <path
                        d="m21 15-4.5-4.5L8 19"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  Ajoutez votre photo dans votre outil d’IA après avoir collé le prompt.
                </p>
              ) : null}

              {/* 5. Le texte tel qu'il sera copie, replie. */}
              {!locked && prompt.payloadReady ? (
                <ApercuDuPrompt promptId={prompt.id} champs={saisies} />
              ) : null}

              {/* 6. Les details : ce qui aide a choisir, apres ce qui sert a
                  agir. Le raccourci /commande y vit, secondaire. */}
              <section
                aria-labelledby="details-commande"
                className="mt-6 border-t border-[color:var(--color-line)] pt-4"
              >
                <h3
                  id="details-commande"
                  className="text-[length:var(--texte-corps)] font-semibold text-[color:var(--color-night)]"
                >
                  Détails
                </h3>

                {niveau ? (
                  <div className="mt-3">
                    <NiveauExecution niveau={niveau} />
                  </div>
                ) : null}

                {prompt.entityType === 'mode_ia' ? (
                  <CorpsMode prompt={prompt} />
                ) : prompt.entityType === 'parcours' ? (
                  <CorpsParcours prompt={prompt} />
                ) : (
                  <CorpsCommande prompt={prompt} />
                )}

                {!prompt.showImageCard && prompt.intention ? (
                  <Section titre="Intention">
                    <p className="text-[length:var(--texte-corps)] leading-[1.5] text-[color:var(--color-night)]">
                      {prompt.intention}
                    </p>
                  </Section>
                ) : null}

                {prompt.modes.length > 0 ? (
                  <Section titre="Elle sait aussi faire">
                    <ModesCommande modes={prompt.modes} />
                  </Section>
                ) : null}

                <MotsCles mots={prompt.motsCles} />

                <Section titre="Raccourci">
                  <CopieDuRaccourci commande={prompt.command} />
                </Section>
              </section>

              {/* 7. L'avertissement ferme la fiche. */}
              <AvertissementResultats
                univers={prompt.library}
                className="mt-5 border-t border-[color:var(--color-line)] pt-3"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <CopyCommandButton
            champs={saisies}
            promptId={prompt.id}
            pret={prompt.payloadReady}
            surface="detail"
            locked={locked}
            genre={prompt.entityType}
            verifierAvantCopie={verifierAvantCopie}
            onLockedClick={ouvrirOffre}
          />
        </div>
      </div>

      {agrandi && prompt.beforeAfter && !locked ? (
        <div className="anim-fondu fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Le fond reste cliquable — c'est le geste attendu d'une visionneuse
              — mais il ne peut plus etre le seul : rien a l'ecran ne disait
              qu'on pouvait en sortir. La croix le dit, et donne au clavier une
              cible qu'un fond n'offre pas. */}
          <div
            aria-hidden="true"
            onClick={() => setAgrandi(false)}
            className="absolute inset-0 bg-[color:var(--color-night)]/90"
          />

          <div className="relative w-full max-w-3xl">
            <BeforeAfterMedia
              media={prompt.beforeAfter}
              command={prompt.command}
              sizes="100vw"
              priority
            />
          </div>

          <span className="absolute right-3 top-3">
            <SheetCloseButton
              onClose={() => setAgrandi(false)}
              libelle="Fermer l’agrandissement"
              sombre
            />
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Le corps d'une fiche de commande image : ce qu'on donne, ce qu'on obtient.
 *
 * C'est l'affichage d'origine, inchange. Il ne convient qu'aux commandes qui
 * produisent un resultat en un tour a partir d'une photo — soit cinq cent
 * quatre-vingt-deux des six cent quatre-vingt-douze entrees du catalogue.
 */
function CorpsCommande({ prompt }: { prompt: PromptCard }) {
  return (
    <>
      {/* « A fournir » disait le contraire de ce que la commande attend.
          Les tuiles venaient de `input_examples`, que l'import a rempli des
          memes valeurs par defaut sur des centaines de cartes : sur une
          commande qui transforme un portrait, on lisait « Texte brut » et
          « Brief » juste au-dessus d'une phrase qui disait « Une photo
          nette de la personne ». C'est le temoin qui fait foi. */}
      <AFournir
        temoin={prompt.witnessType}
        precision={prompt.expectedInput}
        exemples={prompt.inputExamples}
        image={prompt.showImageCard}
      />

      {/* « Vous obtenez » tenait en deux tuiles encadrees, une par format,
          chacune avec son icone et sa precision. Beaucoup de place pour une
          phrase qu'on ne relit pas — et cette place manquait en bas, la ou
          se decide la copie. Une ligne suffit : « 1 image · format 4:5 ». */}
      <VousObtenez
        formats={prompt.outputFormats}
        ratio={prompt.defaultRatio}
        quantite={prompt.imagesMin}
      />

      {/* « Quand l'utiliser » vient apres ce qu'on donne et ce qu'on
              obtient : c'est ce qui fait choisir entre deux commandes
              proches, pas ce qui fait comprendre celle-ci. */}
      {prompt.useCases.length > 0 ? (
        <Section titre="Quand l’utiliser">
          <ListePuces items={prompt.useCases.slice(0, 4)} />
        </Section>
      ) : null}

      {prompt.riskLevel === 'eleve' && prompt.limitations ? (
        <p className="mt-4 rounded-[color:var(--radius-control)] bg-[color:var(--color-member-soft)] px-3 py-2.5 text-[13px] leading-relaxed text-[color:var(--color-member)]">
          {prompt.limitations}
        </p>
      ) : null}

      {prompt.requiredVariables.length > 0 ? (
        <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          S’adapte à votre contexte. Si une information manque, l’IA posera une ou deux questions
          courtes.
        </p>
      ) : null}
    </>
  );
}
