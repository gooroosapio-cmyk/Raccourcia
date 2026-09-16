import type { PromptCard } from '@/lib/catalog/types';

/**
 * Ce qu'on est en train de regarder, dit avant le titre.
 *
 * Une commande image, un mode IA et un parcours se lisent de la meme facon
 * dans une fiche — meme titre, meme raccourci, meme bouton — alors qu'ils ne
 * s'utilisent pas du tout pareil. Un mode ne rend rien : il conditionne la
 * conversation qui suit, et on le colle une fois pour dix echanges. Un
 * parcours rend plusieurs fichiers a la file.
 *
 * Le dire en tete evite la deception : on sait ce qu'on copie avant de le
 * coller. Rien pour une commande image — c'est le cas courant, l'annoncer
 * reviendrait a mettre une etiquette sur chaque fiche.
 */
export function GenreDeFiche({ entityType }: { entityType: PromptCard['entityType'] }) {
  const genres = {
    mode_ia: {
      nom: 'Mode IA',
      promesse: 'Donnez un rôle à votre IA',
    },
    parcours: {
      nom: 'Parcours guidé',
      promesse: 'Un objectif, plusieurs étapes pour y arriver',
    },
  } as const;

  const genre = entityType === 'mode_ia' || entityType === 'parcours' ? genres[entityType] : null;
  if (!genre) return null;

  return (
    <span className="mb-1.5 inline-flex flex-wrap items-baseline gap-x-2 rounded-full bg-[color:var(--color-brand-soft)] px-2.5 py-1">
      <span className="text-[length:var(--texte-meta)] font-bold uppercase tracking-wide text-[color:var(--color-brand-strong)]">
        {genre.nom}
      </span>
      <span className="text-[length:var(--texte-meta)] text-[color:var(--color-night)]/70">
        {genre.promesse}
      </span>
    </span>
  );
}
