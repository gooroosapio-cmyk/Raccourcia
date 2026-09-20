import { Trait } from '@/components/cards/illustration-thematique';
import { habillageDeRayon } from '@/lib/ui/motifs';

/**
 * Le fond d'une carte de rayon qui n'a pas de photo.
 *
 * LE DEFAUT QU'IL CORRIGE. La Bibliotheque pose cinquante cartes
 * illustrees. Le visuel d'un tag n'existe que si l'administration l'a
 * depose, et celui d'une collection que si l'une de ses commandes a une
 * image : un tiers de la grille restait en cadres gris, sans rien pour
 * distinguer « Portrait » de « Prospection » sinon leurs deux mots.
 *
 * CE QU'IL POSE A LA PLACE. Une teinte, toujours. Un dessin quand les mots
 * du rayon en appellent un — un personnage, un graphique, une enveloppe.
 * L'initiale du nom sinon : elle ne dit rien, mais elle distingue, et la
 * grille redevient une grille.
 *
 * Ce n'est pas une photographie et cela ne cherche pas a en avoir l'air.
 * Un rayon ne produit rien ; lui poser une image empruntee ailleurs
 * promettrait un resultat qui n'est pas le sien.
 */
export function FondDeRayon({ slug, nom }: { slug: string; nom: string }) {
  const { teinte, motif, initiale } = habillageDeRayon(slug, nom);

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ backgroundColor: teinte.fond }}
    >
      {motif ? (
        <svg
          width="88"
          height="88"
          viewBox="0 0 48 48"
          fill="none"
          // En retrait, comme sur les cartes de commande : le nom du rayon
          // se pose par-dessus et doit rester le premier lu.
          style={{ color: teinte.encre, opacity: 0.26 }}
        >
          <Trait cle={motif} />
        </svg>
      ) : (
        <span
          className="text-[56px] font-bold leading-none"
          style={{ color: teinte.encre, opacity: 0.22 }}
        >
          {initiale}
        </span>
      )}
    </span>
  );
}
