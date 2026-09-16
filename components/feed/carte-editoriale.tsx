import Link from 'next/link';

/**
 * Une invitation posee dans le feed, a la place d'une carte.
 *
 * Les Modes IA et les Parcours guides avaient chacun leur grand bloc sur
 * l'Accueil, entre les categories et le feed. Deux blocs qu'il fallait
 * franchir pour atteindre les idees, et que l'oeil finissait par sauter
 * comme on saute une banniere.
 *
 * Ici, ils arrivent au milieu de ce qu'on est en train de parcourir, sous la
 * forme d'une question plutot que d'un rayon : on les rencontre au moment ou
 * l'on cherche, pas avant d'avoir commence.
 *
 * Sans visuel : la carte doit se distinguer des idees autour d'elle, pas
 * rivaliser avec elles.
 */
export function CarteEditoriale({
  surtitre,
  question,
  promesse,
  action,
  href,
}: {
  surtitre: string;
  question: string;
  promesse: string;
  action: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-[color:var(--radius-card)] border border-[color:var(--color-brand)]/25 bg-[color:var(--color-brand-soft)] px-4 py-4"
    >
      <span className="text-[length:var(--texte-meta)] font-semibold uppercase tracking-wide text-[color:var(--color-brand-strong)]">
        {surtitre}
      </span>
      <span className="text-[17px] font-bold leading-tight text-[color:var(--color-night)]">
        {question}
      </span>
      <span className="text-[length:var(--texte-carte)] leading-snug text-[color:var(--color-night)]/70">
        {promesse}
      </span>
      <span className="mt-1.5 inline-flex items-center gap-1 text-[length:var(--texte-carte)] font-semibold text-[color:var(--color-brand)]">
        {action}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="m9 5 7 7-7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  );
}
