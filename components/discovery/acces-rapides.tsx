import Link from 'next/link';
import type { LibraryFamily } from '@/lib/catalog/types';

/**
 * Les acces rapides de l'Accueil : six familles, puis les deux experiences
 * qui n'en sont pas.
 *
 * Six et pas huit. Les Modes IA et les Parcours guides ne sont pas des
 * familles d'images rangees a cote des portraits : on ne les cherche pas de
 * la meme facon et on ne les lance pas avec le meme geste. Les melanger dans
 * la meme rangee de pastilles les faisait passer pour deux rayons de plus, et
 * personne ne les trouvait.
 *
 * Les six viennent de la base, dans l'ordre du catalogue — aucune famille
 * n'est nommee ici. Si l'administration en ajoute une septieme, elle apparait
 * sous « Toutes les catégories » sans qu'on redeploie.
 */
export function AccesRapides({ familles }: { familles: LibraryFamily[] }) {
  // Les familles d'images : celles qui ne portent ni mode IA ni parcours. On
  // les reconnait a leur slug, qui vient du classeur et ne bouge pas.
  const speciales = new Set(['modes-ia', 'parcours-guides']);
  const principales = familles.filter((f) => !speciales.has(f.slug)).slice(0, 6);
  const modesIa = familles.find((f) => f.slug === 'modes-ia');
  const parcours = familles.find((f) => f.slug === 'parcours-guides');

  if (principales.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[length:var(--texte-section)] font-bold leading-tight text-[color:var(--color-night)]">
          Par catégorie
        </h2>
        <Link
          href="/app/bibliotheque"
          className="shrink-0 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-brand)]"
        >
          Toutes les catégories
        </Link>
      </div>

      {/* Trois colonnes de pastilles : six tiennent en deux lignes sans
          defilement, donc sans rien cacher derriere un geste. */}
      <ul className="grid grid-cols-3 gap-2">
        {principales.map((famille) => (
          <li key={famille.id}>
            <Link
              href={`/app/bibliotheque/famille/${famille.slug}`}
              className="touch-target flex h-full flex-col items-center justify-center gap-1 rounded-[color:var(--radius-card)] bg-[color:var(--color-sky)] px-2 py-3 text-center"
            >
              <span className="line-clamp-2 text-[length:var(--texte-carte)] font-semibold leading-tight text-[color:var(--color-night)]">
                {nomCourt(famille.name)}
              </span>
              <span className="text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
                {famille.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {modesIa || parcours ? (
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          {modesIa ? (
            <AccesSpecial famille={modesIa} titre="Modes IA" promesse="Des conversations guidées" />
          ) : null}
          {parcours ? (
            <AccesSpecial
              famille={parcours}
              titre="Parcours guidés"
              promesse="Plusieurs livrables"
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function AccesSpecial({
  famille,
  titre,
  promesse,
}: {
  famille: LibraryFamily;
  titre: string;
  promesse: string;
}) {
  return (
    <Link
      href={`/app/bibliotheque/famille/${famille.slug}`}
      className="touch-target flex flex-col justify-center gap-0.5 rounded-[color:var(--radius-card)] border border-[color:var(--color-brand)]/25 bg-[color:var(--color-brand-soft)] px-3 py-3"
    >
      <span className="text-[length:var(--texte-carte)] font-bold leading-tight text-[color:var(--color-brand-strong)]">
        {titre}
      </span>
      <span className="text-[length:var(--texte-meta)] leading-tight text-[color:var(--color-night)]/70">
        {promesse} · {famille.count}
      </span>
    </Link>
  );
}

/**
 * Un nom de famille qui tient dans une pastille.
 *
 * « Portraits et souvenirs » sur trois colonnes se coupe au milieu d'un mot.
 * On garde le premier terme, qui est celui qui identifie : « Portraits »,
 * « Produit », « Publicité ». Le nom complet reste en bibliotheque, ou il a
 * la place.
 */
function nomCourt(nom: string): string {
  const premier = nom.split(/\s+et\s+|\s*[,·]\s*/)[0]!.trim();
  return premier.length >= 4 ? premier : nom;
}
