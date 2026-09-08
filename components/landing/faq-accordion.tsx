/**
 * Questions frequentes, en accordeons natifs.
 *
 * `<details>` plutot qu'un composant client : le navigateur sait deja ouvrir
 * et fermer, annoncer l'etat, laisser la recherche de page trouver un texte
 * replie. Reecrire cela en JavaScript couterait du code, de l'hydratation et
 * de l'accessibilite, pour exactement le meme geste.
 *
 * Toutes fermees a l'arrivee : la FAQ est un recours, pas une lecture.
 */
export type EntreeFAQ = { question: string; reponse: React.ReactNode };

export function FAQAccordion({ entrees }: { entrees: EntreeFAQ[] }) {
  return (
    <div className="divide-y divide-[color:var(--color-line)] overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
      {entrees.map((entree) => (
        <details key={entree.question} className="group">
          <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-[length:var(--texte-corps)] font-semibold text-[color:var(--color-night)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--color-canvas)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--color-brand)] [&::-webkit-details-marker]:hidden">
            {entree.question}
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-sky)] text-[color:var(--color-brand)] transition-transform duration-[var(--duration-base)] group-open:rotate-180"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="m6 9 6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </summary>
          <div className="px-4 pb-4 text-[length:var(--texte-corps)] leading-[1.6] text-[color:var(--color-muted)]">
            {entree.reponse}
          </div>
        </details>
      ))}
    </div>
  );
}
