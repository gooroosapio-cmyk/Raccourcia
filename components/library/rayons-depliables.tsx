'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { CollectionTile } from '@/components/library/collection-tile';
import type { LibraryFamily } from '@/lib/catalog/types';

/**
 * Les rayons de la Bibliotheque, chacun repliable.
 *
 * Deplies par defaut : on vient ici pour voir ce qu'il y a, pas pour ouvrir
 * huit tiroirs avant de trouver. Mais quarante-trois collections font une
 * page longue, et quelqu'un qui connait son rayon veut pouvoir replier le
 * reste plutot que de le faire defiler a chaque visite.
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
const MEMOIRE = 'raccourcia.bibliotheque.replies';
const EVENEMENT = 'raccourcia:replis';

/** Rien de replie : ce que le serveur rend, et le repli quand le stockage refuse. */
const AUCUN: ReadonlySet<string> = new Set();

// Le dernier texte lu et l'ensemble qui en vient. `useSyncExternalStore`
// rappelle la lecture a chaque rendu et compare les references : reconstruire
// un ensemble a chaque appel ferait boucler React indefiniment.
let dernierBrut: string | null = null;
let dernierEnsemble: ReadonlySet<string> = AUCUN;

function lireLesReplis(): ReadonlySet<string> {
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
  const replies = useSyncExternalStore(ecouter, lireLesReplis, () => AUCUN);

  const basculer = useCallback(
    (slug: string) => {
      const apres = new Set(replies);
      if (apres.has(slug)) apres.delete(slug);
      else apres.add(slug);
      try {
        window.localStorage.setItem(MEMOIRE, JSON.stringify([...apres]));
      } catch {
        // Sans stockage, le repli ne survivra pas au rechargement. Il ne sert
        // alors a rien de prevenir : l'ecran ne bougerait pas non plus.
        return;
      }
      window.dispatchEvent(new Event(EVENEMENT));
    },
    [replies],
  );

  return (
    <div className="space-y-5">
      {familles.map((famille) => {
        const replie = replies.has(famille.slug);
        const identifiant = `rayon-${famille.slug}`;

        return (
          <section key={famille.id}>
            <h2>
              <button
                type="button"
                onClick={() => basculer(famille.slug)}
                aria-expanded={!replie}
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
                    replie ? '' : 'rotate-180'
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

            {/* Le contenu sort du DOM quand il est replie plutot que d'etre
                seulement masque : quarante-trois tuiles cachees continueraient
                de charger leurs images et d'etre atteintes par la tabulation. */}
            {replie ? null : (
              <div
                id={identifiant}
                className="mt-2 grid grid-cols-2 gap-2 min-[400px]:gap-[var(--gouttiere-carte)]"
              >
                {famille.collections.map((collection) => (
                  <CollectionTile key={collection.id} tile={collection} famille={famille.name} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
