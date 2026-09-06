import type { LegalKey } from '@/lib/constants';

/**
 * Mise en page des textes legaux.
 *
 * Sobre et orientee lecture : pas de cartes empilees, une seule colonne, une
 * longueur de ligne confortable. Ces pages se lisent, elles ne se parcourent
 * pas.
 */
export function LegalPage({
  titre,
  intro,
  miseAJour,
  children,
}: {
  titre: string;
  intro: string;
  miseAJour: string;
  children: React.ReactNode;
}) {
  return (
    <article className="pt-2">
      <h1 className="text-[28px] font-semibold leading-tight text-[color:var(--color-night)]">
        {titre}
      </h1>
      <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-[color:var(--color-muted)]">
        {intro}
      </p>
      {miseAJour ? (
        <p className="mt-1 text-[13px] text-[color:var(--color-muted)]">Version du {miseAJour}.</p>
      ) : null}

      <div className="mt-6 max-w-[62ch] space-y-6">{children}</div>
    </article>
  );
}

export function LegalSection({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[18px] font-semibold text-[color:var(--color-night)]">{titre}</h2>
      <div className="mt-2 space-y-2.5 text-[15px] leading-relaxed text-[color:var(--color-ink)]">
        {children}
      </div>
    </section>
  );
}

/**
 * Information que l'editeur doit fournir.
 *
 * Tant qu'elle n'est pas renseignee, la page le dit explicitement plutot que
 * d'afficher une valeur inventee : une mention legale fausse expose davantage
 * qu'une mention visiblement incomplete.
 */
export function LegalValue({
  info,
  cle,
  fallback,
}: {
  info: Record<LegalKey, string>;
  cle: LegalKey;
  /** Ce que designe le champ, affiche quand il est vide. */
  fallback: string;
}) {
  const valeur = info[cle];
  if (valeur) return <>{valeur}</>;

  return (
    <span className="rounded bg-[color:var(--color-member-soft)] px-1 text-[color:var(--color-member)]">
      {fallback} : à compléter
    </span>
  );
}
