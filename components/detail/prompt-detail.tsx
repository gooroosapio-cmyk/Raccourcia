'use client';

import { useEffect, useRef, useState } from 'react';
import { AccessBadge } from '@/components/cards/access-badge';
import { AvertissementResultats } from '@/components/detail/avertissement-resultats';
import { BeforeAfterMedia, MediaPlaceholder } from '@/components/media/before-after-media';
import { CompatibilityList } from '@/components/detail/compatibility-list';
import { CopyCommandButton } from '@/components/cards/copy-command-button';
import { FavoriteButton } from '@/components/cards/favorite-button';
import { InputExampleList } from '@/components/detail/input-example-list';
import { NiveauExecution } from '@/components/detail/niveau-execution';
import { OutputFormatList } from '@/components/detail/output-format-list';
import { SheetCloseButton } from '@/components/ui/sheet-close';
import { SheetDragHandle, useSheetDrag } from '@/components/ui/sheet-drag';
import { usePaywall } from '@/components/paywall/paywall-provider';
import { decrireNiveau } from '@/lib/catalog/niveau';
import { useToast } from '@/components/ui/toast';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Fiche d'une commande, en bottom sheet.
 *
 * Le detail reste une couche par-dessus la grille : la fermer rend la
 * position de defilement et les filtres exactement tels qu'ils etaient.
 *
 * Elle repond a quatre questions, dans cet ordre : ce que fait la commande,
 * ce qu'il faut lui fournir, ce qu'on recoit, ou l'utiliser. Le contenu
 * complet de la commande n'est present nulle part : il est demande au clic.
 */
export function PromptDetailSheet({
  prompt,
  provider,
  onProviderChange,
  locked,
  free,
  visiteur = false,
  onClose,
}: {
  prompt: PromptCard;
  provider: string;
  onProviderChange: (provider: string) => void;
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

  const compatibles = prompt.providers.filter((entry) => entry.compatibility !== 'non_supporte');
  const niveau = decrireNiveau(prompt.level, prompt.maxQuestions);
  const actif = compatibles.find((entry) => entry.key === provider) ?? compatibles[0];
  const partiel = actif?.compatibility === 'partiel';

  const partager = async () => {
    const url = `${window.location.origin}/r/${prompt.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: prompt.command, text: prompt.resultSummary, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      show('Lien copié');
    } catch {
      // Un partage annule par l'utilisateur n'est pas une erreur a signaler.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Le fond referme au toucher, mais il n'est pas annonce : la croix
          porte deja ce nom, et deux commandes homonymes se suivant dans la
          lecture vocale ne disent pas laquelle fait quoi. Le clavier a la
          croix et la touche Echap. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{ opacity: glissement.opaciteFond }}
        className="anim-fondu absolute inset-0 bg-[color:var(--color-night)]/45"
      />

      <div
        ref={panneauRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fiche-commande"
        style={glissement.style}
        className="anim-sheet relative flex max-h-[92dvh] w-full max-w-screen-sm flex-col overflow-hidden rounded-t-[color:var(--radius-sheet)] bg-[color:var(--color-surface)] shadow-[var(--shadow-sheet)] transition-transform duration-[var(--duration-sheet)] ease-[var(--ease-out)]"
      >
        {/* La zone de prise couvre la poignee et la barre d'actions : c'est la
            qu'un pouce se pose naturellement pour repousser la fiche. */}
        <div {...glissement.poignee} className="shrink-0 touch-none">
          <SheetDragHandle />

          <header className="flex items-center justify-between gap-1 border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-2 py-1.5">
            <SheetCloseButton ref={fermerRef} onClose={onClose} libelle="Fermer la fiche" />

            <div className="flex items-center">
              <FavoriteButton
                promptId={prompt.id}
                initial={prompt.isFavorite}
                disabled={locked || visiteur}
              />
              <button
                type="button"
                onClick={partager}
                aria-label="Partager cette commande"
                className="touch-target inline-flex items-center justify-center rounded-full text-[color:var(--color-muted)]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
          {prompt.showImageCard ? (
            <div className="relative">
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
          ) : prompt.intention ? (
            /*
             * Commande texte : la place reservee au visuel porte l'intention.
             *
             * Une commande texte n'a pas d'avant/apres a montrer. Le decor qui
             * occupait ce cadre — des traits imitant des lignes de texte —
             * n'apprenait rien; les cas d'usage, eux, sont repris plus bas
             * sous « Quand l'utiliser », et les lire deux fois a dix lignes
             * d'intervalle ne les rend pas plus clairs. L'intention dit autre
             * chose : ce que la commande cherche a obtenir.
             */
            <div className="rounded-[color:var(--radius-card)] bg-gradient-to-br from-[color:var(--color-sky)] to-[color:var(--color-canvas)] px-4 py-3.5">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-brand)]/75">
                Intention
              </h3>
              <p className="mt-1.5 text-[length:var(--texte-corps)] leading-[1.45] text-[color:var(--color-night)]">
                {prompt.intention}
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-2">
            <h2
              id="fiche-commande"
              className="commande truncate text-[22px] font-semibold text-[color:var(--color-brand)]"
            >
              {prompt.command}
            </h2>
            <AccessBadge free={free} locked={locked} isNew={prompt.isNew} />
          </div>

          {/* Ce que fait la commande, en premiere information apres son nom.
              `result_summary` decrit le format produit et se repete a
              l'identique sur toute une famille : il est dit plus bas, dans
              « Resultat », ou c'est sa place. */}
          <p className="mt-1.5 text-[length:var(--texte-corps)] leading-[1.5] text-[color:var(--color-night)]">
            {prompt.shortDescription || prompt.resultSummary}
          </p>

          {/* Entre « ce que ca fait » et « ce qu'il faut fournir » : est-ce
              que la commande rend un resultat tout de suite, ou est-ce
              qu'elle va d'abord poser des questions ? C'est ce qui separe
              vraiment deux commandes voisines, et personne ne le savait
              avant de copier. */}
          {niveau ? (
            <div className="mt-4">
              <NiveauExecution niveau={niveau} />
            </div>
          ) : null}

          {prompt.inputExamples.length > 0 || prompt.expectedInput ? (
            <Section titre="À fournir">
              {prompt.inputExamples.length > 0 ? (
                <InputExampleList inputs={prompt.inputExamples} />
              ) : null}
              {prompt.expectedInput ? (
                <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
                  {prompt.expectedInput}
                </p>
              ) : null}
            </Section>
          ) : null}

          {prompt.outputFormats.length > 0 || prompt.resultSummary ? (
            <Section titre="Vous obtenez">
              {prompt.outputFormats.length > 0 ? (
                <OutputFormatList formats={prompt.outputFormats} />
              ) : null}
              {prompt.resultSummary && prompt.resultSummary !== prompt.shortDescription ? (
                <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
                  {prompt.resultSummary}
                </p>
              ) : null}
            </Section>
          ) : null}

          {/* « Quand l'utiliser » vient apres ce qu'on donne et ce qu'on
              obtient : c'est ce qui fait choisir entre deux commandes
              proches, pas ce qui fait comprendre celle-ci. */}
          {prompt.useCases.length > 0 ? (
            <Section titre="Quand l’utiliser">
              <ul className="flex flex-col gap-1.5">
                {prompt.useCases.slice(0, 4).map((cas) => (
                  <li
                    key={cas}
                    className="flex items-start gap-2 text-[length:var(--texte-carte)] leading-snug text-[color:var(--color-night)]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.5em] block h-1 w-1 shrink-0 rounded-full bg-[color:var(--color-brand)]"
                    />
                    <span>{cas}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {compatibles.length > 0 ? (
            <Section titre="Compatible avec">
              <CompatibilityList
                providers={compatibles}
                selected={actif?.key}
                onSelect={onProviderChange}
              />
              {partiel ? (
                <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--color-warning)]">
                  La commande fonctionne, mais la génération de l’image dépend de l’interface de
                  cette IA.
                </p>
              ) : null}
            </Section>
          ) : null}

          {prompt.riskLevel === 'eleve' && prompt.limitations ? (
            <p className="mt-4 rounded-[color:var(--radius-control)] bg-[color:var(--color-member-soft)] px-3 py-2.5 text-[13px] leading-relaxed text-[color:var(--color-member)]">
              {prompt.limitations}
            </p>
          ) : null}

          {prompt.requiredVariables.length > 0 ? (
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
              S’adapte à votre contexte. Si une information manque, l’IA posera une ou deux
              questions courtes.
            </p>
          ) : null}

          <AvertissementResultats className="mt-5 border-t border-[color:var(--color-line)] pt-3" />
        </div>

        <div className="shrink-0 border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <CopyCommandButton
            promptId={prompt.id}
            provider={actif?.key ?? 'chatgpt'}
            surface="detail"
            locked={locked}
            onLockedClick={ouvrirOffre}
            proposerOuverture
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

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
        {titre}
      </h3>
      {children}
    </section>
  );
}
