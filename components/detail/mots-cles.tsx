import Link from 'next/link';

/**
 * Les tags d'une fiche, et ce qu'ils ouvrent.
 *
 * Ce ne sont pas des etiquettes decoratives : chacun mene a la Bibliotheque,
 * filtree sur lui. C'est la sortie naturelle d'une fiche qui ne convient
 * pas tout a fait — « pas celle-la, mais quelque chose de ce genre » — et
 * elle n'existait nulle part : il fallait fermer, remonter, et recommencer
 * une recherche.
 *
 * Rendu au serveur : ce sont des liens, rien de plus.
 */
export function MotsCles({ mots }: { mots: { slug: string; nom: string }[] }) {
  if (mots.length === 0) return null;

  return (
    <section className="mt-5">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
        Dans le même esprit
      </h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {mots.map((mot) => (
          <li key={mot.slug}>
            <Link
              href={`/app/bibliotheque/tag/${mot.slug}`}
              className="touch-target inline-flex items-center rounded-full bg-[color:var(--color-sky)] px-3.5 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-night)]"
            >
              {mot.nom}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
