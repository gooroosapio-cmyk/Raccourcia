'use client';

import { useCallback, useState } from 'react';
import { PromptGrid } from '@/components/cards/prompt-grid';
import { Sentinelle } from '@/components/feed/sentinelle';
import { chargerLaGalerie, type CritereDeGalerie } from '@/lib/actions/galerie';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Une galerie filtree qui ne s'arrete pas.
 *
 * Trois ecrans finissaient par un bouton « Voir plus de commandes » : une
 * navigation complete, la position perdue, et la liste a redescendre. Le
 * catalogue compte desormais quinze cents commandes ; a vingt-quatre par
 * clic, personne n'atteint la fin, et ce qui est range loin n'existe pas.
 *
 * La sentinelle demande le lot suivant une hauteur d'ecran a l'avance, donc
 * la suite est la avant qu'on y arrive. Elle garde son bouton pour le
 * clavier : un defilement infini sans equivalent actionnable enferme qui ne
 * se sert pas d'un pouce.
 *
 * Ce composant ne connait pas le rangement — famille, collection, tag ou
 * recherche : il transporte un critere opaque que le serveur revalide. Les
 * trois ecrans partagent donc un seul comportement, et une correction ici
 * les corrige tous.
 */
export function GalerieInfinie({
  premieres,
  critere,
  encore,
  locked,
  visiteur,
  emptyState,
  rayons,
}: {
  /** Le premier lot, rendu par le serveur. */
  premieres: PromptCard[];
  critere: CritereDeGalerie;
  /** Faux quand le serveur sait deja qu'il n'y a rien apres. */
  encore: boolean;
  locked: boolean;
  visiteur: boolean;
  emptyState: React.ReactNode;
  rayons?: Record<string, string>;
}) {
  const [ajoutees, setAjoutees] = useState<PromptCard[]>([]);
  const [page, setPage] = useState(1);
  const [charge, setCharge] = useState(false);
  const [fini, setFini] = useState(!encore);

  const allonger = useCallback(() => {
    if (charge || fini) return;
    setCharge(true);

    const suivante = page + 1;
    void chargerLaGalerie(critere, suivante)
      .then((cartes) => {
        setPage(suivante);
        if (cartes.length === 0) {
          setFini(true);
          return;
        }
        // Deux requetes differentes peuvent rendre la meme carte : la
        // montrer deux fois donnerait une galerie qui begaie.
        setAjoutees((actuelles) => {
          const vues = new Set([...premieres, ...actuelles].map((carte) => carte.id));
          return [...actuelles, ...cartes.filter((carte) => !vues.has(carte.id))];
        });
      })
      // Un reseau qui lache arrete la galerie plutot que de relancer la
      // meme requete a chaque pixel de defilement.
      .catch(() => setFini(true))
      .finally(() => setCharge(false));
  }, [charge, critere, fini, page, premieres]);

  const toutes = ajoutees.length > 0 ? [...premieres, ...ajoutees] : premieres;

  return (
    <>
      <PromptGrid
        prompts={toutes}
        locked={locked}
        visiteur={visiteur}
        emptyState={emptyState}
        rayons={rayons}
      />

      {!fini && toutes.length > 0 ? (
        <Sentinelle onVisible={allonger} libelle="Voir plus de commandes" charge={charge} />
      ) : null}
    </>
  );
}
