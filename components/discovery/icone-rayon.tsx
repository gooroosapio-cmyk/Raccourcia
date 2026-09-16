/**
 * L'icone d'un rayon, tiree de sa position dans le catalogue.
 *
 * Six dessins, dans l'ordre : portraits, styles, art, produit, publicite,
 * technique. La position et non le nom : associer un dessin a « Photos
 * produit » demanderait d'ecrire les rayons en dur dans l'ecran, et le jour
 * ou l'administration en renomme un, l'icone disparaitrait sans prevenir.
 *
 * Partagee entre la rangee « Explorer » et les cartes de la galerie : une
 * carte de « Photos produit » porte le meme signe que la pastille qui y mene,
 * sinon ce ne serait pas un repere mais une decoration de plus.
 */
const TRAITS = [
  // Portraits : un buste.
  'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5 20a7 7 0 0 1 14 0',
  // Styles : un cintre.
  'M12 7a2 2 0 1 1 2 2c-1.2 0-2 .8-2 2M4 19l8-6 8 6H4Z',
  // Art & effets : une etoile a quatre branches.
  'M12 3.5c.6 4.2 1.8 5.4 6 6-4.2.6-5.4 1.8-6 6-.6-4.2-1.8-5.4-6-6 4.2-.6 5.4-1.8 6-6Z',
  // Produit : une boite.
  'M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5ZM4 8l8 4.5L20 8M12 12.5V20',
  // Publicite : un porte-voix.
  'M4 10v4h3l6 4V6l-6 4H4ZM17.5 9a4 4 0 0 1 0 6',
  // Technique : un compas.
  'M12 4v3M9.5 20l2.5-9 2.5 9M12 7a2.5 2.5 0 0 1 2.5 2.5c0 1-.6 1.9-1.5 2.3M12 7a2.5 2.5 0 0 0-2.5 2.5c0 1 .6 1.9 1.5 2.3',
];

export function IconeRayon({ index, taille = 24 }: { index: number; taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={TRAITS[index % TRAITS.length]}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
