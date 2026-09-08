import { avisPublies, paysDesAvis } from '@/lib/landing/avis';

/**
 * Rangee de pastilles sous les avis.
 *
 * Des initiales, pas des visages. Les personnes citees ont envoye un message,
 * pas une photo : afficher des portraits pris ailleurs donnerait un visage a
 * quelqu'un qui n'est pas elle, et transformerait quatre temoignages vrais en
 * decor douteux.
 *
 * Les pays sont ceux des avis, et rien de plus. Allonger la liste ferait
 * passer une carte pour une preuve.
 */
export function BullesUtilisateurs() {
  const avis = avisPublies();
  if (avis.length === 0) return null;

  const pays = paysDesAvis();
  const teintes = [
    'bg-[color:var(--color-brand)]',
    'bg-[color:var(--color-night)]',
    'bg-[color:var(--color-brand-strong)]',
    'bg-[color:var(--color-success)]',
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <ul
        className="flex items-center"
        aria-label={`${avis.length} personnes ont partagé leur retour`}
      >
        {avis.map((entree, index) => (
          <li key={entree.auteur} className={index === 0 ? '' : '-ml-2.5'}>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-[color:var(--color-surface)] text-[length:var(--texte-carte)] font-bold text-white ${
                teintes[index % teintes.length]
              }`}
              title={entree.auteur}
            >
              {initiales(entree.auteur)}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-center text-[length:var(--texte-carte)] text-[color:var(--color-muted)]">
        {pays.join(' · ')}
      </p>
    </div>
  );
}

/** Une ou deux lettres, selon ce que le nom donne. */
function initiales(nom: string): string {
  return nom
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? '')
    .join('');
}
