'use client';

import Link from 'next/link';
import { retenirUnivers } from '@/lib/actions/univers';
import { LIBRARIES, LIBRARY_LABELS, type Library } from '@/lib/constants';

/**
 * Les trois univers : Visuels, Redaction, Assistants.
 *
 * Trois boutons compacts, sans description (rapport de refonte, accueil) :
 * le nom suffit, et une phrase sous chacun repoussait la suite de l'ecran.
 * Celui qui est actif le montre, et un lecteur d'ecran l'annonce.
 *
 * LE CHOIX SE RETIENT, ET SEULEMENT LUI. Toucher un univers l'inscrit dans
 * un cookie d'un an, pose par le serveur ; la visite suivante s'ouvre dessus. Rien d'autre ne
 * le deplace — ni un defilement, ni une fiche ouverte dans un autre univers.
 */
export function ChoixUnivers({
  actif,
  base,
  parametre = 'univers',
  avecTout = false,
}: {
  /** `null` quand aucun univers ne filtre (« Tout », dans Favoris). */
  actif: Library | null;
  /**
   * Ajoute « Tout » en tete. Pour une liste personnelle — les favoris — un
   * univers par defaut cacherait ce qu'on a range ailleurs. « Tout » ne se
   * retient pas : ce n'est pas un univers.
   */
  avecTout?: boolean;
  /** L'adresse de l'ecran qui porte le choix : `/app`, `/app/favoris`… */
  base: string;
  /** Le nom du parametre d'adresse que l'ecran lit. */
  parametre?: string;
}) {
  return (
    <nav aria-label="Univers" className={`grid gap-2 ${avecTout ? 'grid-cols-4' : 'grid-cols-3'}`}>
      {avecTout ? (
        <Link
          href={base}
          aria-current={actif === null ? 'page' : undefined}
          scroll={false}
          className={`flex min-h-11 items-center justify-center rounded-[color:var(--radius-control)] px-2 text-[length:var(--texte-carte)] font-semibold transition-colors duration-[var(--duration-fast)] ${
            actif === null
              ? 'bg-[color:var(--color-brand)] text-white'
              : 'border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-night)]'
          }`}
        >
          Tout
        </Link>
      ) : null}
      {LIBRARIES.map((univers) => {
        const estActif = univers === actif;
        return (
          <Link
            key={univers}
            href={`${base}?${parametre}=${univers}`}
            onClick={() => void retenirUnivers(univers)}
            aria-current={estActif ? 'page' : undefined}
            scroll={false}
            className={`flex min-h-11 items-center justify-center rounded-[color:var(--radius-control)] px-2 text-[length:var(--texte-carte)] font-semibold transition-colors duration-[var(--duration-fast)] ${
              estActif
                ? 'bg-[color:var(--color-brand)] text-white'
                : 'border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-night)]'
            }`}
          >
            {LIBRARY_LABELS[univers]}
          </Link>
        );
      })}
    </nav>
  );
}
