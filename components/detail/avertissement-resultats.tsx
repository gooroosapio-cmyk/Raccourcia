import type { Library } from '@/lib/constants';

/**
 * Rappel de fin de fiche : les deux formulations definitives du rapport de
 * refonte UI (23 septembre 2026), une par nature de resultat.
 *
 * Il ferme la fiche plutot que de l'ouvrir : place en tete, il ferait douter
 * avant meme d'avoir lu ce que la commande fait. Le ton reste factuel — gris
 * clair, sans encadre ni pictogramme d'alerte.
 *
 * Aucun nom d'IA : le texte est le meme partout, et c'est le modele choisi
 * par le membre qui fait varier le resultat.
 *
 * Sans balise `role="alert"` : ce n'est pas une alerte, c'est une note de bas
 * de page. Un lecteur d'ecran l'annoncerait par-dessus la lecture en cours.
 */
export function AvertissementResultats({
  univers,
  className = '',
}: {
  /** La bibliotheque de la commande ; les Visuels ont leur propre phrase. */
  univers: Library | null;
  className?: string;
}) {
  return (
    <p className={`text-[12px] leading-relaxed text-[color:var(--color-muted)]/80 ${className}`}>
      {univers === 'images'
        ? 'Prompt conçu pour les modèles de génération d’images. Le résultat varie selon le modèle utilisé.'
        : 'Le résultat varie selon le modèle d’IA utilisé. Relisez avant utilisation.'}
    </p>
  );
}
