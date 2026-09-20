import { OUTPUT_FORMAT_LABELS, type OutputFormatKind } from '@/lib/constants';

/**
 * Ce que la commande rend, en une ligne : « 1 image finale · format 4:5 ».
 *
 * La fiche consacrait un bloc de deux tuiles a cette information — un
 * cadre, une icone et une precision par format. C'est beaucoup de place
 * pour une phrase que personne ne relit deux fois, et cette place manquait
 * en bas, ou se decide la copie.
 *
 * Trois faits, dans l'ordre ou ils comptent : combien, de quoi, a quel
 * format. Le format ne se dit que pour ce qui a une forme : une commande
 * texte n'a pas de ratio, et annoncer « format — » vaut moins que se taire.
 * Une commande image, elle, en a toujours un — declare ou par defaut.
 */

/**
 * Ce que le catalogue vise quand il ne dit rien.
 *
 * Le 4:5 est le format des 582 commandes image du catalogue ; une carte
 * sans ratio declare n'en produit pas moins une image. Se taire laissait
 * un blanc a l'endroit le plus concret de la fiche.
 */
const RATIO_PAR_DEFAUT = '4:5';

export function VousObtenez({
  formats,
  ratio,
  quantite,
}: {
  formats: OutputFormatKind[];
  ratio: string | null;
  /** Combien d'elements la commande rend. `null` quand le catalogue se tait. */
  quantite: number | null;
}) {
  if (formats.length === 0) return null;

  const principal = formats[0]!;
  const nombre = quantite && quantite > 0 ? quantite : 1;

  // « 1 image finale », « 3 images finales ». Le pluriel se fait sur le
  // libelle, pas sur une chaine recopiee : un format ajoute en base ne doit
  // pas demander de repasser ici.
  const objet = `${nombre} ${OUTPUT_FORMAT_LABELS[principal].toLowerCase()}${nombre > 1 ? 's' : ''}`;

  // Le ratio ne vaut que pour ce qui a une forme. « Multi-format » compris :
  // c'est une reponse, meme si ce n'est pas un chiffre.
  const precisions = [
    formats.length > 1
      ? formats
          .slice(1)
          .map((format) => OUTPUT_FORMAT_LABELS[format])
          .join(', ')
      : null,
    // « par defaut » : le ratio est celui que la commande vise, pas une
    // contrainte. L'IA rend autre chose si on le lui demande, et annoncer
    // « format 4:5 » sec laissait croire a une fatalite.
    principal === 'image' ? `format ${ratio ?? RATIO_PAR_DEFAUT} par défaut` : null,
  ].filter((precision): precision is string => Boolean(precision));

  return (
    <section className="mt-4">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
        Vous obtenez
      </h3>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-[length:var(--texte-corps)] leading-snug text-[color:var(--color-night)]">
        <span className="font-semibold">{objet}</span>
        {precisions.map((precision) => (
          <span key={precision} className="text-[color:var(--color-muted)]">
            <span aria-hidden="true">· </span>
            {precision}
          </span>
        ))}
      </p>
    </section>
  );
}
