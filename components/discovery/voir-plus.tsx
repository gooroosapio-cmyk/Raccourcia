'use client';

import Link from 'next/link';
import { useLinkStatus } from 'next/link';

/**
 * « Voir plus de commandes », avec l'etat de son propre chargement.
 *
 * Le lot suivant se demande au serveur : sur un reseau lent, il s'ecoule une
 * seconde ou deux pendant lesquelles rien ne bouge. Un bouton qui ne repond
 * pas se touche deux fois, et la seconde touche ne sert a rien.
 *
 * `loading.tsx` ne couvre pas ce cas : la navigation reste dans le meme
 * segment, l'ancienne liste demeure a l'ecran — ce qui est heureux, mais
 * laisse le bouton muet. `useLinkStatus` dit ce que la page ne dit pas.
 */
function Etat({ libelle }: { libelle: string }) {
  const { pending } = useLinkStatus();

  return (
    <>
      {pending ? (
        <span
          aria-hidden="true"
          className="mr-2 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[color:var(--color-line)] border-t-[color:var(--color-brand)]"
        />
      ) : null}
      <span>{pending ? 'Chargement…' : libelle}</span>
    </>
  );
}

export function VoirPlus({ href }: { href: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      // Le lot suivant depend des filtres en cours : le precharger a
      // l'affichage telechargerait une liste que personne n'a demandee, et
      // l'etat de chargement ne se declencherait jamais.
      prefetch={false}
      className="flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[15px] font-medium text-[color:var(--color-night)]"
    >
      <Etat libelle="Voir plus de commandes" />
    </Link>
  );
}
