'use client';

import { useCallback, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { Icone } from '@/components/ui/icone';

/**
 * Les rayons de la Bibliotheque, chacun repliable.
 *
 * Groupes par defaut : quarante-cinq rayons deployes font une page qu'on fait
 * defiler longtemps avant d'avoir tout vu, et le premier palier n'y sert plus
 * a rien. Six titres tiennent sur un ecran — on voit la forme du catalogue
 * d'un coup d'oeil, puis on ouvre celui qu'on veut.
 *
 * L'etat retenu porte sur ce qui est *ouvert*, pas sur ce qui est ferme :
 * ainsi un rayon ajoute en administration arrive ferme comme les autres, au
 * lieu d'apparaitre deploye parce que personne ne l'avait encore replie.
 *
 * Un rayon est ouvert au premier passage, les autres fermes : une page dont
 * tout est replie ne montre que des titres, et l'on ne sait plus a quoi
 * ressemble ce qu'il y a derriere. Le premier choix de la personne remplace
 * ensuite ce reglage, et definitivement — « aucun rayon ouvert » est un choix
 * comme un autre, distinct de « pas encore choisi ».
 *
 * Les tuiles arrivent deja rendues, depuis le serveur. Leurs dessins pesent
 * cinquante kilo-octets a eux tous et n'ont rien a faire dans le navigateur :
 * ce composant ne fait que les montrer ou les cacher.
 *
 * L'etat est retenu. Il vit dans le navigateur de la personne : c'est un
 * confort de lecture, pas une donnee du compte — il n'a rien a faire sur le
 * serveur et ne suit pas d'un appareil a l'autre.
 *
 * Il passe par `useSyncExternalStore` et non par un effet. Le serveur ne
 * connait pas le stockage : il rend le reglage par defaut, et React remplace
 * par l'etat retenu juste apres l'hydratation, sans que les deux rendus se
 * contredisent. Un effet qui appellerait `setState` ferait le meme travail en
 * deux rendus, avec les rayons qui s'ouvrent puis se referment sous les yeux.
 */
const MEMOIRE = 'raccourcia.bibliotheque.ouverts';
const EVENEMENT = 'raccourcia:rayons-ouverts';

/**
 * « Pas encore choisi ».
 *
 * Distinct d'un ensemble vide, qui veut dire « tout ferme, et c'est voulu ».
 * C'est aussi ce que rend le serveur, qui ne connait pas le stockage : les
 * deux premiers rendus disent donc la meme chose et rien ne saute a
 * l'hydratation.
 */
const PAS_DE_CHOIX = null;

// Le dernier texte lu et l'ensemble qui en vient. `useSyncExternalStore`
// rappelle la lecture a chaque rendu et compare les references : reconstruire
// un ensemble a chaque appel ferait boucler React indefiniment.
let dernierBrut: string | null = null;
let dernierEnsemble: ReadonlySet<string> | null = PAS_DE_CHOIX;

function lireLesOuverts(): ReadonlySet<string> | null {
  let brut: string | null = null;
  try {
    brut = window.localStorage.getItem(MEMOIRE);
  } catch {
    // Navigation privee, stockage bloque : on se passe de memoire.
    return PAS_DE_CHOIX;
  }
  if (brut !== dernierBrut) {
    dernierBrut = brut;
    try {
      dernierEnsemble = brut ? new Set(JSON.parse(brut) as string[]) : PAS_DE_CHOIX;
    } catch {
      dernierEnsemble = PAS_DE_CHOIX;
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

/** Un rayon, tel que la page le prepare : son nom, son trait, ses tuiles. */
export type RayonDepliable = {
  id: string;
  slug: string;
  nom: string;
  /** Le dessin du kit, resolu au serveur. `null` pour un rayon qu'il ignore. */
  icone: string | null;
  /** Les tuiles, deja rendues. */
  tuiles: ReactNode;
};

export function RayonsDepliables({ rayons }: { rayons: RayonDepliable[] }) {
  const memoire = useSyncExternalStore(ecouter, lireLesOuverts, () => PAS_DE_CHOIX);
  const premier = rayons[0]?.slug;

  // Faute de choix retenu, le premier rayon est ouvert. L'ensemble est
  // memorise : `useSyncExternalStore` compare les references a chaque rendu.
  const parDefaut = useMemo(
    () => (premier ? (new Set([premier]) as ReadonlySet<string>) : new Set<string>()),
    [premier],
  );
  const ouverts = memoire ?? parDefaut;

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
    <div>
      {rayons.map((rayon) => {
        const ouvert = ouverts.has(rayon.slug);
        const identifiant = `rayon-${rayon.slug}`;

        return (
          <section
            key={rayon.id}
            className="border-b border-[color:var(--color-line)] last:border-b-0"
          >
            <h2>
              <button
                type="button"
                onClick={() => basculer(rayon.slug)}
                aria-expanded={ouvert}
                aria-controls={identifiant}
                className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left"
              >
                {rayon.icone ? (
                  <span className="text-[color:var(--color-brand)]">
                    <Icone svg={rayon.icone} taille={22} />
                  </span>
                ) : null}
                <span className="flex-1 text-[length:var(--texte-titre-carte)] font-bold leading-tight text-[color:var(--color-night)]">
                  {rayon.nom}
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

            {/* Cache plutot que retire du DOM : les tuiles viennent du
                serveur, les retirer du rendu ne ferait rien gagner.

                La classe d'affichage bascule, elle n'est pas seulement
                complétee par l'attribut : `display: grid` l'emporterait sur
                la regle de `[hidden]`, et un rayon ferme resterait visible.
                L'attribut reste pour ce qu'il dit — le contenu sort de la
                tabulation et de la lecture vocale. */}
            <div
              id={identifiant}
              hidden={!ouvert}
              className={`${
                ouvert ? 'grid' : 'hidden'
              } grid-cols-1 gap-2 pb-4 min-[360px]:grid-cols-2 min-[400px]:gap-[var(--gouttiere-carte)]`}
            >
              {rayon.tuiles}
            </div>
          </section>
        );
      })}
    </div>
  );
}
