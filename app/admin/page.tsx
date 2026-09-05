import Link from 'next/link';

import { getAdminDashboard } from '@/lib/admin/queries';
import { MODE_LABELS } from '@/lib/constants';

export const metadata = { title: 'Tableau de bord' };

/**
 * Tableau de bord : uniquement des alertes utiles, pas un mur de widgets
 * (Spec UX/UI, 19). Ce qui est affiche doit appeler une action.
 */
export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboard();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Tableau de bord</h1>
        <p className="mt-1 text-[13px] text-[color:var(--color-muted)]">
          {dashboard.total} raccourcis au catalogue.
        </p>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Publies" value={dashboard.published} tone="success" />
        <Stat label="Brouillons" value={dashboard.drafts} tone="warning" />
        <Stat label="Archives" value={dashboard.archived} />
      </section>

      <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
          Par mode
        </h2>
        <ul className="mt-3 space-y-2">
          {(['image', 'texte', 'analyse'] as const).map((mode) => (
            <li key={mode} className="flex items-center justify-between text-[15px]">
              <span className="text-[color:var(--color-ink)]">{MODE_LABELS[mode]}</span>
              <span className="font-medium text-[color:var(--color-night)]">
                {dashboard.byMode[mode]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {dashboard.hiddenCategories > 0 ? (
        <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
          <h2 className="text-[15px] font-medium text-[color:var(--color-night)]">
            {dashboard.hiddenCategories} categorie
            {dashboard.hiddenCategories > 1 ? 's' : ''} masquee
            {dashboard.hiddenCategories > 1 ? 's' : ''}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
            Leurs raccourcis n apparaissent pas dans la bibliotheque. Les donnees sont conservees.
          </p>
          <Link
            href="/admin/categories"
            className="mt-3 inline-flex h-11 items-center rounded-[color:var(--radius-control)] bg-[color:var(--color-sky)] px-3 text-sm font-medium text-[color:var(--color-night)]"
          >
            Voir les categories
          </Link>
        </section>
      ) : null}

      {dashboard.incomplete.length > 0 ? (
        <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-warning)] bg-[#FFF8EE] p-4">
          <h2 className="text-[15px] font-medium text-[color:var(--color-night)]">
            {dashboard.incomplete.length} raccourci
            {dashboard.incomplete.length > 1 ? 's' : ''} publie
            {dashboard.incomplete.length > 1 ? 's' : ''} sans categorie
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
            Ils resteront invisibles tant qu ils ne sont pas classes.
          </p>
          <ul className="mt-3 space-y-1">
            {dashboard.incomplete.map((prompt) => (
              <li key={prompt.id}>
                <Link
                  href={`/admin/raccourcis/${prompt.id}`}
                  className="font-mono text-[14px] font-medium text-[color:var(--color-brand)]"
                >
                  {prompt.command}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
          Activite recente
        </h2>
        {dashboard.recentActivity.length === 0 ? (
          <p className="mt-2 text-[13px] text-[color:var(--color-muted)]">
            Aucune action enregistree pour l instant.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[color:var(--color-line)]">
            {dashboard.recentActivity.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-3 py-2 text-[13px]">
                <span className="text-[color:var(--color-ink)]">{entry.action}</span>
                <span className="shrink-0 text-[color:var(--color-muted)]">
                  {new Date(entry.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/admin/raccourcis/nouveau"
        className="flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] font-medium text-white"
      >
        Creer un raccourci
      </Link>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'success' | 'warning';
}) {
  const color =
    tone === 'success'
      ? 'text-[color:var(--color-success)]'
      : tone === 'warning'
        ? 'text-[color:var(--color-warning)]'
        : 'text-[color:var(--color-night)]';

  return (
    <div className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3 text-center">
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      <p className="mt-0.5 text-[12px] text-[color:var(--color-muted)]">{label}</p>
    </div>
  );
}
