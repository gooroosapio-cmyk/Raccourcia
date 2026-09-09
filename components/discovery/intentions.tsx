'use client';

/**
 * « Que voulez-vous créer ? » — l'entree par l'intention.
 *
 * Les propositions viennent des familles publiees, jamais d'une liste ecrite
 * ici : une famille masquee disparait d'elle-meme, une famille ajoutee
 * apparait sans redeploiement. C'est aussi la regle du projet — aucune
 * categorie codee en dur dans le frontend.
 *
 * La zone remplace la rangee de chips sur l'Accueil nu, elle ne s'y ajoute
 * pas : les deux proposent exactement les memes familles, et les empiler
 * ferait deux fois le meme choix l'un sous l'autre en repoussant les cartes
 * hors de l'ecran. Des qu'un choix est fait, les chips reprennent la main —
 * compactes, elles laissent la place aux resultats.
 */
export type Intention = {
  slug: string;
  nom: string;
  /** A quoi sert la famille, telle que le catalogue la decrit. */
  description: string;
};

export function Intentions({
  intentions,
  onSelect,
}: {
  intentions: Intention[];
  onSelect: (slug: string) => void;
}) {
  if (intentions.length === 0) return null;

  return (
    <section aria-labelledby="titre-intentions" className="pt-0.5">
      <h2
        id="titre-intentions"
        className="mb-2 text-[length:var(--texte-carte)] font-semibold text-[color:var(--color-night)]"
      >
        Que voulez-vous créer&nbsp;?
      </h2>

      <ul className="grid grid-cols-2 gap-2">
        {intentions.map((intention) => (
          <li key={intention.slug}>
            <button
              type="button"
              onClick={() => onSelect(intention.slug)}
              className="touch-target flex h-full w-full flex-col justify-center gap-0.5 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2 text-left transition-colors duration-[var(--duration-fast)] active:bg-[color:var(--color-sky)]"
            >
              <span className="line-clamp-2 text-[length:var(--texte-carte)] font-semibold leading-tight text-[color:var(--color-night)]">
                {intention.nom}
              </span>
              {intention.description ? (
                <span className="line-clamp-1 text-[length:var(--texte-meta)] leading-snug text-[color:var(--color-muted)]">
                  {intention.description}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
