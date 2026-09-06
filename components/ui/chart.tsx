/**
 * Graphiques du back-office.
 *
 * Une seule serie, donc une seule couleur : la longueur porte la valeur, la
 * teinte ne code rien de plus. Les chiffres sont ecrits en toutes lettres a
 * cote des barres plutot que caches dans une infobulle : sur mobile il n'y a
 * pas de survol, et une valeur qui n'apparait qu'au survol n'existe pas.
 */

export type Bar = { key: string; label: string; copies: number };

/** Barres horizontales : comparer quelques categories nommees. */
export function BarList({ bars, empty }: { bars: Bar[]; empty: string }) {
  if (bars.length === 0) {
    return <p className="text-[13px] text-[color:var(--color-muted)]">{empty}</p>;
  }

  const max = Math.max(...bars.map((bar) => bar.copies), 1);

  return (
    <ul className="space-y-3">
      {bars.map((bar) => (
        <li key={bar.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[14px] text-[color:var(--color-ink)]">
              {bar.label}
            </span>
            <span className="shrink-0 text-[14px] font-medium tabular-nums text-[color:var(--color-night)]">
              {bar.copies.toLocaleString('fr-FR')}
            </span>
          </div>
          {/* Piste puis barre : la piste donne l'echelle commune. */}
          <div className="mt-1 h-2 w-full rounded-full bg-[color:var(--color-canvas)]">
            <div
              className="h-2 rounded-r-[4px] bg-[color:var(--color-brand)]"
              style={{ width: `${Math.max((bar.copies / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Colonnes par jour.
 *
 * Les jours sans copie sont dessines a zero, pas omis : une courbe qui saute
 * les jours vides ment par omission. Aucune valeur n'est ecrite sur les
 * colonnes — il y en a trop — mais chacune porte son libelle accessible, et
 * le total comme le pic sont donnes en clair sous le graphique.
 */
export function DailyColumns({ days }: { days: { day: string; copies: number }[] }) {
  if (days.length === 0) {
    return (
      <p className="text-[13px] text-[color:var(--color-muted)]">Aucune copie sur la période.</p>
    );
  }

  const max = Math.max(...days.map((entry) => entry.copies), 1);
  const total = days.reduce((sum, entry) => sum + entry.copies, 0);
  const peak = days.reduce((best, entry) => (entry.copies > best.copies ? entry : best), days[0]!);

  const formatDay = (day: string) =>
    new Date(day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return (
    <figure className="m-0">
      <div
        role="img"
        aria-label={`Copies par jour sur ${days.length} jours, ${total} au total.`}
        className="flex h-24 items-end gap-[2px] border-b border-[color:var(--color-line)]"
      >
        {days.map((entry) => (
          <div
            key={entry.day}
            title={`${formatDay(entry.day)} : ${entry.copies}`}
            className="min-w-0 flex-1 rounded-t-[4px] bg-[color:var(--color-brand)]"
            style={{
              // Un jour a zero garde un trait fin : la colonne existe, elle est vide.
              height: entry.copies === 0 ? '1px' : `${Math.max((entry.copies / max) * 100, 4)}%`,
              backgroundColor: entry.copies === 0 ? 'var(--color-line)' : 'var(--color-brand)',
            }}
          />
        ))}
      </div>

      <div className="mt-2 flex justify-between text-[12px] text-[color:var(--color-muted)]">
        <span>{formatDay(days[0]!.day)}</span>
        <span>{formatDay(days[days.length - 1]!.day)}</span>
      </div>

      <figcaption className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
        {total.toLocaleString('fr-FR')} copie{total > 1 ? 's' : ''} sur la periode
        {peak.copies > 0 ? `, pic le ${formatDay(peak.day)} avec ${peak.copies}` : ''}.
      </figcaption>
    </figure>
  );
}

/** Chiffre de tete : un nombre, son libelle, et au besoin une precision. */
export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'warning';
}) {
  return (
    <div className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3">
      <p
        className={`text-2xl font-semibold tabular-nums ${
          tone === 'warning'
            ? 'text-[color:var(--color-warning)]'
            : 'text-[color:var(--color-night)]'
        }`}
      >
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
      </p>
      <p className="mt-0.5 text-[12px] text-[color:var(--color-muted)]">{label}</p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-[color:var(--color-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
