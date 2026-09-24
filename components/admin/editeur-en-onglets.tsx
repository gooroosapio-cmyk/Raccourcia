'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Onglet = { cle: string; libelle: string; contenu: ReactNode };

/**
 * L'editeur d'une commande en quatre sections (rapport de refonte, p. 11) :
 * Contenu, Prompt et champs, Medias, Publication.
 *
 * Toutes les sections restent dans la page — seul l'onglet actif est
 * visible — pour qu'une saisie en cours dans l'une ne se perde pas quand on
 * regarde l'autre.
 *
 * DEPART NON ENREGISTRE. Des qu'un champ change, quitter la page (fermer
 * l'onglet, suivre un lien) demande confirmation ; envoyer un formulaire
 * leve la garde. Ce n'est pas une sauvegarde automatique : chaque section
 * garde son bouton, et son retour dit l'etat reel.
 */
export function EditeurEnOnglets({ onglets }: { onglets: Onglet[] }) {
  const [actif, setActif] = useState(onglets[0]?.cle ?? '');
  const zone = useRef<HTMLDivElement>(null);
  const modifie = useRef(false);

  useEffect(() => {
    const element = zone.current;
    if (!element) return;
    const marquer = () => {
      modifie.current = true;
    };
    const lever = () => {
      modifie.current = false;
    };
    const avantDepart = (evenement: BeforeUnloadEvent) => {
      if (!modifie.current) return;
      evenement.preventDefault();
    };
    // Un lien interne ne declenche pas `beforeunload` : on le retient ici.
    const surLien = (evenement: MouseEvent) => {
      if (!modifie.current) return;
      const lien = (evenement.target as HTMLElement | null)?.closest('a[href]');
      if (!lien) return;
      if (!window.confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?')) {
        evenement.preventDefault();
        evenement.stopPropagation();
      } else {
        modifie.current = false;
      }
    };
    element.addEventListener('input', marquer);
    element.addEventListener('submit', lever);
    window.addEventListener('beforeunload', avantDepart);
    document.addEventListener('click', surLien, true);
    return () => {
      element.removeEventListener('input', marquer);
      element.removeEventListener('submit', lever);
      window.removeEventListener('beforeunload', avantDepart);
      document.removeEventListener('click', surLien, true);
    };
  }, []);

  return (
    <div ref={zone} className="space-y-4">
      <div
        role="tablist"
        aria-label="Sections de l’éditeur"
        className="grid grid-cols-2 gap-1 rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-1 sm:grid-cols-4"
      >
        {onglets.map((onglet) => (
          <button
            key={onglet.cle}
            type="button"
            role="tab"
            id={`onglet-${onglet.cle}`}
            aria-selected={onglet.cle === actif}
            aria-controls={`panneau-${onglet.cle}`}
            onClick={() => setActif(onglet.cle)}
            className={`min-h-11 rounded-[10px] px-2 text-[14px] font-medium transition-colors duration-[var(--duration-fast)] ${
              onglet.cle === actif
                ? 'bg-[color:var(--color-brand)] text-white'
                : 'text-[color:var(--color-night)] hover:bg-[color:var(--color-canvas)]'
            }`}
          >
            {onglet.libelle}
          </button>
        ))}
      </div>

      {onglets.map((onglet) => (
        <div
          key={onglet.cle}
          role="tabpanel"
          id={`panneau-${onglet.cle}`}
          aria-labelledby={`onglet-${onglet.cle}`}
          hidden={onglet.cle !== actif}
          className="space-y-4"
        >
          {onglet.contenu}
        </div>
      ))}
    </div>
  );
}
