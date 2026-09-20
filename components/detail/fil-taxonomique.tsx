import { LIBRARY_LABELS, type Library } from '@/lib/constants';

/**
 * Ou l'on se trouve, en une ligne : « Images > Matieres et metamorphoses ».
 *
 * La fiche affichait cote a cote le genre d'experience, la collection et
 * les tags, tous dessines pareil. Trois rangees de pastilles qui se
 * ressemblent laissent croire qu'elles disent la meme chose, alors que
 * l'une range, l'autre situe et la troisieme decrit.
 *
 * Le fil ne dit plus que le rangement, et deux niveaux suffisent : la
 * bibliotheque, parce que c'est la premiere decision qu'on a prise, et la
 * collection, parce que c'est l'etagere. La categorie reste au classeur —
 * « Portraits et photographie » ne fait choisir personne.
 *
 * Il ne se clique pas. On est dans une couche posee sur la galerie : un
 * lien ici fermerait la fiche pour ouvrir une autre page, et le geste
 * attendu — revenir a ce qu'on regardait — passe par la croix.
 */
export function FilTaxonomique({
  library,
  collection,
}: {
  library: Library | null;
  collection: string | null;
}) {
  const etapes = [library ? LIBRARY_LABELS[library] : null, collection].filter(
    (etape): etape is string => Boolean(etape),
  );

  if (etapes.length === 0) return null;

  return (
    <p className="flex flex-wrap items-center gap-1 text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
      {etapes.map((etape, rang) => (
        <span key={etape} className="flex items-center gap-1">
          {rang > 0 ? (
            <span aria-hidden="true" className="text-[color:var(--color-line)]">
              ›
            </span>
          ) : null}
          <span
            className={
              rang === 0
                ? 'rounded-full bg-[color:var(--color-sky)] px-2 py-0.5 font-medium text-[color:var(--color-brand)]'
                : 'rounded-full bg-[color:var(--color-canvas)] px-2 py-0.5'
            }
          >
            {etape}
          </span>
        </span>
      ))}
    </p>
  );
}
