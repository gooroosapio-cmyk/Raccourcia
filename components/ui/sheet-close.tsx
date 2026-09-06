/**
 * Croix de fermeture d'une fenetre contextuelle.
 *
 * Le meme bouton sur toutes les couches — fiche, filtres, offre,
 * agrandissement — parce qu'une fermeture ne doit pas se chercher : c'est le
 * geste de sortie, il se trouve toujours au meme endroit et sous la meme
 * forme.
 *
 * Une croix, jamais un chevron. Un chevron « retour » annonce une navigation
 * vers un ailleurs ; ici on ne va nulle part, on referme une couche et l'on
 * retrouve exactement ce qu'on regardait.
 *
 * Le glissement vers le bas ne remplace pas ce bouton : une souris ne glisse
 * pas, un clavier non plus, et un lecteur d'ecran n'annonce pas un geste.
 */
export function SheetCloseButton({
  onClose,
  libelle = 'Fermer',
  ref,
  sombre = false,
}: {
  onClose: () => void;
  /** Ce que la fermeture ferme, dit en toutes lettres pour l'annonce vocale. */
  libelle?: string;
  ref?: React.Ref<HTMLButtonElement>;
  /** Vrai sur un fond sombre : la croix passe en clair pour rester lisible. */
  sombre?: boolean;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClose}
      aria-label={libelle}
      className={`touch-target inline-flex items-center justify-center rounded-full transition-colors duration-[var(--duration-fast)] ${
        sombre
          ? 'bg-white/15 text-white active:bg-white/25'
          : 'text-[color:var(--color-night)] active:bg-[color:var(--color-sky)]'
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m6 6 12 12M18 6 6 18"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
