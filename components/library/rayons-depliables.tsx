'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { CollectionTile } from '@/components/library/collection-tile';
import type { LibraryFamily } from '@/lib/catalog/types';

/**
 * Les rayons de la Bibliotheque, chacun repliable.
 *
 * Groupes par defaut : quarante-trois collections deployees font une page
 * qu'on fait defiler longtemps avant d'avoir tout vu, et le premier palier
 * n'y sert plus a rien. Six titres tiennent sur un ecran — on voit la forme
 * du catalogue d'un coup d'oeil, puis on ouvre celui qu'on veut.
 *
 * L'etat retenu porte donc sur ce qui est *ouvert*, pas sur ce qui est
 * ferme : ainsi un rayon ajoute en administration arrive ferme comme les
 * autres, au lieu d'apparaitre deploye parce que personne ne l'avait encore
 * replie.
 *
 * L'etat est retenu. Il vit dans le navigateur de la personne : c'est un
 * confort de lecture, pas une donnee du compte — il n'a rien a faire sur le
 * serveur et ne suit pas d'un appareil a l'autre.
 *
 * Il passe par `useSyncExternalStore` et non par un effet. Le serveur ne
 * connait pas le stockage : il rend tout deplie, et React remplace par
 * l'etat retenu juste apres l'hydratation, sans que les deux rendus se
 * contredisent. Un effet qui appellerait `setState` ferait le meme travail
 * en deux rendus, avec les rayons qui s'ouvrent puis se referment sous les
 * yeux.
 */
const MEMOIRE = 'raccourcia.bibliotheque.ouverts';
const EVENEMENT = 'raccourcia:rayons-ouverts';

/** Rien d'ouvert : ce que le serveur rend, et le repli quand le stockage refuse. */
const AUCUN: ReadonlySet<string> = new Set();

// Le dernier texte lu et l'ensemble qui en vient. `useSyncExternalStore`
// rappelle la lecture a chaque rendu et compare les references : reconstruire
// un ensemble a chaque appel ferait boucler React indefiniment.
let dernierBrut: string | null = null;
let dernierEnsemble: ReadonlySet<string> = AUCUN;

function lireLesOuverts(): ReadonlySet<string> {
  let brut: string | null = null;
  try {
    brut = window.localStorage.getItem(MEMOIRE);
  } catch {
    // Navigation privee, stockage bloque : on se passe de memoire.
    return AUCUN;
  }
  if (brut !== dernierBrut) {
    dernierBrut = brut;
    try {
      dernierEnsemble = brut ? new Set(JSON.parse(brut) as string[]) : AUCUN;
    } catch {
      dernierEnsemble = AUCUN;
    }
  }
  return dernierEnsemble;
}

function ecouter(rappel: () => void): () => void {
  // `storage` pour un autre onglet, l'evenement maison pour celui-ci : le
  // navigateur ne se previent pas lui-meme de ses propres ecritures.
  window.addEventListener('storage', rappel);
  window.addEventListener(EVENEMENT, rappel);
  return () => {
    window.removeEventListener('storage', rappel);
    window.removeEventListener(EVENEMENT, rappel);
  };
}

export function RayonsDepliables({ familles }: { familles: LibraryFamily[] }) {
  const ouverts = useSyncExternalStore(ecouter, lireLesOuverts, () => AUCUN);

  const basculer = useCallback(
    (slug: string) => {
      const apres = new Set(ouverts);
      if (apres.has(slug)) apres.delete(slug);
      else apres.add(slug);
      try {
        window.localStorage.setItem(MEMOIRE, JSON.stringify([...apres]));
      } catch {
        // Sans stockage, l'ouverture ne survivra pas au rechargement. Il ne sert
        // alors a rien de prevenir : l'ecran ne bougerait pas non plus.
        return;
      }
      window.dispatchEvent(new Event(EVENEMENT));
    },
    [ouverts],
  );

  return (
    <div className="space-y-5">
      {familles.map((famille) => {
        const ouvert = ouverts.has(famille.slug);
        const identifiant = `rayon-${famille.slug}`;

        return (
          <section key={famille.id}>
            <h2>
              <button
                type="button"
                onClick={() => basculer(famille.slug)}
                aria-expanded={ouvert}
                aria-controls={identifiant}
                className="touch-target flex w-full items-center justify-between gap-3 py-1 text-left"
              >
                <span className="text-[length:var(--texte-section)] font-bold leading-tight text-[color:var(--color-night)]">
                  {famille.name}
                </span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className={`shrink-0 text-[color:var(--color-muted)] transition-transform duration-[var(--duration-fast)] ${
                    ouvert ? 'rotate-180' : ''
                  }`}
                >
                  <path
                    d="m6 9 6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </h2>

            {/* Le contenu n'existe que lorsqu'il est ouvert plutot que d'etre
                masque : quarante-trois tuiles cachees continueraient de
                charger leurs images et d'etre atteintes par la tabulation. */}
            {ouvert ? (
              <div
                id={identifiant}
                className="mt-2 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 min-[400px]:gap-[var(--gouttiere-carte)]"
              >
                {famille.collections.map((collection) => (
                  <CollectionTile key={collection.id} tile={collection} famille={famille.name} />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
