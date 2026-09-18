'use client';

import Link from 'next/link';
import { Icone } from '@/components/ui/icone';
import type { PromptCard } from '@/lib/catalog/types';

/**
 * Le rayon d'ou vient la carte, et le chemin pour y aller.
 *
 * On tombe sur une commande qui approche de ce qu'on cherche sans etre tout a
 * fait ca. Le bon geste suivant est d'aller voir ses voisines — et il fallait
 * jusqu'ici remonter a la Bibliotheque, rouvrir la bonne famille, y retrouver
 * le rayon. Quatre gestes pour une question qui se pose en permanence devant
 * une galerie. La carte porte donc le nom de son rayon, et ce nom est un
 * lien.
 *
 * C'est un lien frere de la carte, jamais un lien dans la carte : la vignette
 * et le titre sont deja un bouton qui ouvre la fiche, et un element cliquable
 * dans un autre rend la cible imprevisible — au doigt comme au clavier.
 *
 * Le trait du rayon vient du serveur, resolu par slug : les soixante-douze
 * traits du kit vivent dans un seul objet, et y toucher depuis une carte les
 * ferait tous entrer dans le navigateur.
 */
export function LienDeCollection({
  prompt,
  trait,
}: {
  prompt: PromptCard;
  /** Le dessin du rayon, ou `null` quand l'ecran ne le connait pas. */
  trait?: string | null;
}) {
  if (!prompt.collectionSlug || !prompt.collectionName) return null;

  return (
    <Link
      href={`/app/bibliotheque/${prompt.collectionSlug}`}
      // La cible fait 44 px de haut sans en occuper autant a l'oeil : le
      // remplissage vertical deborde sur les marges de la carte plutot que de
      // pousser le titre et le bouton.
      className="touch-target -my-1.5 inline-flex min-w-0 max-w-full items-center gap-1.5 py-1.5 text-left"
    >
      {trait ? (
        <span aria-hidden="true" className="shrink-0 text-[color:var(--color-brand)]/70">
          <Icone svg={trait} taille={14} />
        </span>
      ) : null}
      <span className="truncate text-[length:var(--texte-meta)] font-medium text-[color:var(--color-muted)]">
        {prompt.collectionName}
      </span>
      {/* Le nom seul ressemble a une etiquette ; le lecteur d'ecran a besoin
          qu'on lui dise que c'est une destination. */}
      <span className="sr-only">— voir tout le rayon</span>
    </Link>
  );
}
