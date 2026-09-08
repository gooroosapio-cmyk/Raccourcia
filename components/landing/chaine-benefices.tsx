/**
 * La chaine de ce qu'un bon prompt declenche.
 *
 * Un maillon par gain, dans l'ordre ou ils s'enchainent. La fleche est
 * decorative : lue a voix haute, la liste ordonnee dit deja la suite, et une
 * fleche annoncee entre chaque terme ferait un bruit inutile.
 *
 * La rangee se replie sur plusieurs lignes en dessous de 430 px : cinq
 * maillons ne tiennent pas cote a cote sur un telephone, et les serrer
 * jusqu'a huit pixels de texte les rendrait illisibles pour gagner une ligne.
 */
const MAILLONS = [
  'Temps gagné',
  'Meilleure formulation',
  'Meilleur résultat',
  'Moins d’essais',
  'Moins de frustration',
];

export function ChaineBenefices() {
  return (
    <ol className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2">
      {MAILLONS.map((maillon, index) => (
        <li key={maillon} className="flex items-center gap-1.5">
          {index > 0 ? <Fleche /> : null}
          <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-1.5 text-[length:var(--texte-carte)] font-semibold text-[color:var(--color-night)]">
            {maillon}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Fleche() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-[color:var(--color-brand)]"
    >
      <path
        d="M5 12h13m0 0-5-5m5 5-5 5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
