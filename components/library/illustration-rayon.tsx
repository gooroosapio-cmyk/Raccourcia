import { illustrationDuRayon } from '@/lib/ui/illustrations';

/**
 * Le dessin qui coiffe la tuile d'un rayon.
 *
 * Une composition abstraite et non une photographie, pour une raison qui
 * n'est pas esthetique : une image de resultat en haut d'une tuile de menu
 * se lit comme un exemple de ce que la commande produit. Une chaussure
 * servant de couverture a un rayon de creativite disait litteralement autre
 * chose que ce qu'il contient.
 *
 * Le cadre reserve son rapport 8:5 avant d'avoir le dessin : la grille ne
 * bouge donc pas selon qu'un rayon est illustre ou non.
 *
 * Rendu au serveur. Les cinquante dessins ne traversent jamais le reseau
 * vers le navigateur : seuls ceux que l'ecran montre voyagent.
 */
export function IllustrationDeRayon({ slug, nom }: { slug: string; nom: string }) {
  const dessin = illustrationDuRayon(slug);

  if (!dessin) {
    /*
     * Rayon que le kit ne connait pas. Plutot qu'une illustration prise dans
     * la liste — qui nommerait le mauvais rayon — la tuile porte l'initiale
     * du sien sur le fond des illustrations. Le rapport reste le meme, donc
     * la grille ne s'en apercoit pas.
     */
    return (
      <span
        aria-hidden="true"
        className="flex aspect-[8/5] w-full items-center justify-center rounded-t-[color:var(--radius-card)] bg-[color:var(--illus-fond)] text-[28px] font-bold text-[color:var(--illus-trait)]/45"
      >
        {nom.trim().charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      className="svg-kit block aspect-[8/5] w-full overflow-hidden rounded-t-[color:var(--radius-card)]"
      role="img"
      aria-label={nom}
      dangerouslySetInnerHTML={{ __html: dessin }}
    />
  );
}
