/**
 * La zone haute d'une carte : le meme cadre pour toutes.
 *
 * Trois endroits reservaient cette place chacun de leur cote — la vignette,
 * son repli, et la zone d'intention des cartes texte. Trois occasions de voir
 * la grille sauter le jour ou l'un des trois change de proportion, alors que
 * c'est precisement ce que ce cadre existe pour empecher : sans hauteur
 * reservee, l'arrivee des visuels ferait bouger la grille sous le pouce.
 *
 * Le cadre est aussi le seul endroit ou une carte peut annoncer quelque chose
 * sans voler une ligne de texte : c'est la que se pose le repere des
 * commandes qui menent une mission.
 */
export function VisualSlot({
  ton = 'media',
  mission = false,
  children,
}: {
  /**
   * `media` pour un visuel qui remplit le cadre, `texte` pour un contenu
   * qu'il faut poser sur un fond.
   */
  ton?: 'media' | 'texte';
  /**
   * Vrai pour une commande qui conduit un travail en plusieurs etapes plutot
   * que de rendre un resultat en un tour. Les autres niveaux sont la norme :
   * les signaler tous reviendrait a n'en signaler aucun.
   */
  mission?: boolean;
  children: React.ReactNode;
}) {
  const fond =
    ton === 'texte'
      ? 'bg-gradient-to-br from-[color:var(--color-sky)] to-[color:var(--color-canvas)]'
      : 'bg-[color:var(--color-canvas)]';

  return (
    <span className={`relative block aspect-[4/3] w-full overflow-hidden ${fond}`}>
      {children}
      {mission ? (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-[color:var(--color-night)]/70 px-2 py-0.5 text-[length:var(--texte-meta)] font-medium text-white backdrop-blur-[2px]">
          Mission
        </span>
      ) : null}
    </span>
  );
}
