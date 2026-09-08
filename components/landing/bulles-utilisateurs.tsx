import Image from 'next/image';

import { avisPublies, paysUtilisateurs } from '@/lib/landing/avis';

/**
 * Rangee de pastilles sous les avis.
 *
 * La photo de profil quand la personne l'a transmise, ses initiales sinon.
 * Jamais un portrait pris ailleurs : il donnerait un visage a quelqu'un qui
 * n'est pas elle, et transformerait quatre temoignages vrais en decor
 * douteux. Une photo de profil n'est pas forcement un visage — celle de
 * G. Blaise est un lion, celle de Hene Diop une photo de couple : c'est ce
 * qu'elles montrent d'elles, et c'est a ce titre qu'on les montre.
 *
 * Les pays ne sont pas ceux des quatre avis affiches mais ceux d'ou des
 * retours sont reellement arrives : l'equipe en recoit plus qu'elle n'en
 * publie. La liste est tenue a la main dans `lib/landing/avis.ts`, pour
 * qu'aucun pays ne s'y ajoute sans qu'un message en vienne.
 */
export function BullesUtilisateurs() {
  const avis = avisPublies();
  if (avis.length === 0) return null;

  const pays = paysUtilisateurs();
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
        aria-label={`${avis.length} des personnes qui ont partagé leur retour`}
      >
        {avis.map((entree, index) => (
          <li key={entree.auteur} className={index === 0 ? '' : '-ml-2.5'}>
            {entree.photo ? (
              <Image
                src={entree.photo}
                alt=""
                width={192}
                height={192}
                loading="lazy"
                className="h-9 w-9 rounded-full border-2 border-[color:var(--color-surface)] object-cover"
                title={entree.auteur}
              />
            ) : (
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-[color:var(--color-surface)] text-[length:var(--texte-carte)] font-bold text-white ${
                  teintes[index % teintes.length]
                }`}
                title={entree.auteur}
              >
                {initiales(entree.auteur)}
              </span>
            )}
          </li>
        ))}
      </ul>

      <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5">
        {pays.map((nom) => (
          <li
            key={nom}
            className="rounded-full bg-[color:var(--color-surface)] px-2.5 py-1 text-[length:var(--texte-meta)] font-medium text-[color:var(--color-muted)]"
          >
            {nom}
          </li>
        ))}
      </ul>
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
