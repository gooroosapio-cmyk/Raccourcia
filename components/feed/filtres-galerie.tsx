'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { SheetCloseButton } from '@/components/ui/sheet-close';
import { SheetDragHandle } from '@/components/ui/sheet-drag';
import {
  FORMATS,
  FORMAT_LABELS,
  SUJETS,
  SUJET_LABELS,
  type FiltresGalerie,
} from '@/lib/catalog/sujets';

/**
 * Les filtres de la galerie : un raccourci visible, le reste a un geste.
 *
 * Deux grands menus deroulants — « Tous les formats », « Tous les sujets » —
 * et « Plus d'options » sur sa propre ligne occupaient trois lignes au-dessus
 * de la galerie, soit la hauteur de la premiere rangee de cartes. On payait
 * cette place en permanence pour un reglage qu'on fait rarement.
 *
 * Reste en vue la seule question qu'on se pose vraiment devant une galerie
 * d'images : est-ce que ca transforme une personne ou un objet ? Elle tient
 * en trois puces. Le format et l'acces passent dans un panneau, avec un
 * bouton qui dit combien de reglages y sont actifs — pour qu'un filtre pose
 * puis oublie ne devienne jamais une galerie qui parait vide.
 *
 * Les puces ne doublent pas les six rayons de l'Accueil : ceux-la menent a
 * une page, celles-ci restreignent la liste qui est dessous.
 */
export function FiltresDeGalerie({
  valeurs,
  onChange,
}: {
  valeurs: FiltresGalerie;
  onChange: (valeurs: FiltresGalerie) => void;
}) {
  const [panneauOuvert, setPanneauOuvert] = useState(false);
  const declencheur = useRef<HTMLButtonElement>(null);

  // Ce que le panneau porte, et lui seul : le sujet est deja en puces.
  const dansLePanneau = [valeurs.format, valeurs.acces].filter(Boolean).length;

  return (
    <div className="mb-3 flex items-center gap-2">
      {/* La rangee defile dans son cadre, pas avec la page.
          Elle ne sort des marges qu'a GAUCHE — a droite, le bouton
          « Filtres » occupe deja la place —, donc pas de
          `pleine-largeur` ici : cette classe sort des deux cotes. La
          variable, elle, est la meme, et c'est ce qui compte : la valeur
          reste declaree a un seul endroit.
          Le fondu a droite remplace la coupe nette : la derniere puce etait
          tranchee net au bord du bouton « Filtres », ce qui se lit comme un
          defaut d'affichage plutot que comme « il y en a d'autres ». Le
          fondu dit la meme chose sans avoir l'air casse, et la marge
          empeche la puce de toucher le bouton. */}
      <div className="rail ml-[calc(var(--marge-coquille)*-1)] flex flex-1 gap-2 pl-[var(--marge-coquille)] pr-3 [mask-image:linear-gradient(to_right,black_calc(100%-20px),transparent)]">
        <Puce active={!valeurs.sujet} onClick={() => onChange({ ...valeurs, sujet: undefined })}>
          Tout
        </Puce>
        {SUJETS.map((sujet) => (
          <Puce
            key={sujet}
            active={valeurs.sujet === sujet}
            onClick={() =>
              onChange({ ...valeurs, sujet: valeurs.sujet === sujet ? undefined : sujet })
            }
          >
            {SUJET_LABELS[sujet]}
          </Puce>
        ))}
      </div>

      <button
        ref={declencheur}
        type="button"
        onClick={() => setPanneauOuvert(true)}
        aria-haspopup="dialog"
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-night)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M10 5H3m9 14H3m11-16v4m2 10v4m5-9h-9m9 7h-5m5-14h-7M8 10v4m0-2H3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Filtres
        {dansLePanneau > 0 ? (
          /* Le nombre, pas une pastille muette : « deux reglages » explique
             une galerie courte, un point de couleur ne l'explique pas. */
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--color-brand)] px-1 text-[11px] font-bold text-white">
            {dansLePanneau}
          </span>
        ) : null}
      </button>

      {panneauOuvert ? (
        <PanneauDeFiltres
          valeurs={valeurs}
          onAppliquer={(retenues) => {
            onChange(retenues);
            setPanneauOuvert(false);
          }}
          onFermer={() => setPanneauOuvert(false)}
          declencheur={declencheur}
        />
      ) : null}
    </div>
  );
}

/**
 * Le panneau, ouvert depuis le bas.
 *
 * Ce qu'on y touche reste provisoire jusqu'a « Appliquer » : fermer sans
 * appliquer rend la galerie exactement telle qu'elle etait. Sans cela, on
 * essaie un reglage, on change d'avis, et l'on a deja perdu sa liste.
 */
function PanneauDeFiltres({
  valeurs,
  onAppliquer,
  onFermer,
  declencheur,
}: {
  valeurs: FiltresGalerie;
  onAppliquer: (valeurs: FiltresGalerie) => void;
  onFermer: () => void;
  declencheur: React.RefObject<HTMLButtonElement | null>;
}) {
  const [brouillon, setBrouillon] = useState<FiltresGalerie>(valeurs);
  const panneau = useRef<HTMLDivElement>(null);
  const fermer = useRef<HTMLButtonElement>(null);
  const titre = useId();

  useEffect(() => {
    // Copie locale : React conseille de ne pas lire une ref au nettoyage, le
    // noeud qu'elle designait ayant pu changer entre-temps.
    const bouton = declencheur.current;
    fermer.current?.focus();

    const auClavier = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') {
        onFermer();
        return;
      }
      // Le focus reste dans le panneau : sinon la tabulation continue dans la
      // galerie derriere, invisible et inutilisable.
      if (evenement.key !== 'Tab' || !panneau.current) return;
      const cibles = panneau.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (cibles.length === 0) return;
      const premier = cibles[0]!;
      const dernier = cibles[cibles.length - 1]!;
      if (evenement.shiftKey && document.activeElement === premier) {
        evenement.preventDefault();
        dernier.focus();
      } else if (!evenement.shiftKey && document.activeElement === dernier) {
        evenement.preventDefault();
        premier.focus();
      }
    };

    document.addEventListener('keydown', auClavier);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', auClavier);
      document.body.style.overflow = '';
      // Le focus retourne au bouton qui a ouvert, pas en haut de page.
      bouton?.focus();
    };
  }, [onFermer, declencheur]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        aria-hidden="true"
        onClick={onFermer}
        className="anim-fondu absolute inset-0 bg-[color:var(--color-night)]/45"
      />

      <div
        ref={panneau}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titre}
        className="anim-sheet relative flex max-h-[85dvh] w-full max-w-screen-sm flex-col overflow-hidden rounded-t-[color:var(--radius-sheet)] bg-[color:var(--color-surface)] shadow-[var(--shadow-sheet)]"
      >
        <SheetDragHandle />

        <header className="flex items-center justify-between gap-2 px-3 pb-2">
          <SheetCloseButton ref={fermer} onClose={onFermer} libelle="Fermer les filtres" />
          <h2
            id={titre}
            className="text-[length:var(--texte-corps)] font-bold text-[color:var(--color-night)]"
          >
            Filtres
          </h2>
          <button
            type="button"
            onClick={() => setBrouillon({})}
            className="touch-target px-2 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-brand)]"
          >
            Réinitialiser
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <Groupe titre="Ce que vous cherchez">
            <Choix
              actif={!brouillon.format}
              onClick={() => setBrouillon({ ...brouillon, format: undefined })}
            >
              Tout
            </Choix>
            {FORMATS.map((format) => (
              <Choix
                key={format}
                actif={brouillon.format === format}
                onClick={() => setBrouillon({ ...brouillon, format })}
              >
                {FORMAT_LABELS[format]}
              </Choix>
            ))}
          </Groupe>

          <Groupe titre="Sur quoi ça porte">
            <Choix
              actif={!brouillon.sujet}
              onClick={() => setBrouillon({ ...brouillon, sujet: undefined })}
            >
              Tout
            </Choix>
            {SUJETS.map((sujet) => (
              <Choix
                key={sujet}
                actif={brouillon.sujet === sujet}
                onClick={() => setBrouillon({ ...brouillon, sujet })}
              >
                {SUJET_LABELS[sujet]}
              </Choix>
            ))}
          </Groupe>

          <Groupe titre="Accès">
            <Choix
              actif={!brouillon.acces}
              onClick={() => setBrouillon({ ...brouillon, acces: undefined })}
            >
              Tout
            </Choix>
            <Choix
              actif={brouillon.acces === 'gratuit'}
              onClick={() => setBrouillon({ ...brouillon, acces: 'gratuit' })}
            >
              Offert
            </Choix>
            <Choix
              actif={brouillon.acces === 'membre'}
              onClick={() => setBrouillon({ ...brouillon, acces: 'membre' })}
            >
              Accès à vie
            </Choix>
          </Groupe>
        </div>

        <div className="shrink-0 border-t border-[color:var(--color-line)] px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={() => onAppliquer(brouillon)}
            className="flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] text-[15px] font-semibold text-white"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 first:mt-2">
      <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
        {titre}
      </h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function Choix({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`flex h-11 items-center rounded-[color:var(--radius-control)] border px-3.5 text-[length:var(--texte-carte)] font-medium transition-colors duration-[var(--duration-fast)] ${
        actif
          ? 'border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-strong)]'
          : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-night)]'
      }`}
    >
      {children}
    </button>
  );
}

function Puce({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-[length:var(--texte-carte)] font-medium transition-colors duration-[var(--duration-fast)] ${
        active
          ? 'border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-white'
          : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-night)]'
      }`}
    >
      {children}
    </button>
  );
}
