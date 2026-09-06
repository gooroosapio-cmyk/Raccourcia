import Link from 'next/link';

import { getAnalytics, parseWindow, ANALYTICS_WINDOWS } from '@/lib/admin/analytics';
import { BarList, DailyColumns, Stat } from '@/components/ui/chart';
import { MODE_LABELS } from '@/lib/constants';

export const metadata = { title: 'Analytics' };

/**
 * Ce qui est copie, et ce qui ne l'est pas.
 *
 * Le tableau ne mesure pas les membres mais le catalogue : quels raccourcis
 * servent, lesquels dorment, depuis quelle IA et depuis quel ecran. Aucun
 * chiffre ne descend au niveau d'une personne.
 */
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const days = parseWindow(typeof params.jours === 'string' ? params.jours : undefined);
  const data = await getAnalytics(days);

  const dormant = data.promptsPublished - data.promptsCopied;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Analytics</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          Ce que les membres copient reellement. Les chiffres sont agrégés : ils ne disent jamais
          qui a copie quoi.
        </p>
      </div>

      <nav aria-label="Periode" className="-mx-5 overflow-x-auto px-5">
        <ul className="flex w-max gap-2">
          {ANALYTICS_WINDOWS.map((value) => (
            <li key={value}>
              <Link
                href={`/admin/analytics?jours=${value}`}
                aria-current={value === days ? 'page' : undefined}
                className={`inline-flex h-9 items-center whitespace-nowrap rounded-full px-3 text-[13px] font-medium ${
                  value === days
                    ? 'bg-[color:var(--color-brand)] text-white'
                    : 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]'
                }`}
              >
                {value} jours
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="grid grid-cols-2 gap-3">
        <Stat label={`Copies sur ${days} jours`} value={data.copiesPeriod} />
        <Stat
          label="Membres actifs"
          value={data.activeMembers}
          hint="Ont copie au moins une fois"
        />
        <Stat label="Accès à vie actifs" value={data.membersWithAccess} />
        <Stat
          label="Achats non actifs"
          value={data.purchasesUnclaimed}
          tone={data.purchasesUnclaimed > 0 ? 'warning' : undefined}
          hint="Payes, sans compte créé"
        />
      </section>

      {data.purchasesUnclaimed > 0 ? (
        <p className="rounded-[color:var(--radius-card)] border border-[color:var(--color-warning)] bg-[#FFF8EE] p-3 text-[13px] leading-relaxed text-[color:var(--color-night)]">
          {data.purchasesUnclaimed} personne{data.purchasesUnclaimed > 1 ? 's’ont' : ' a'} paye sans
          jamais activer son acces. C est le seul chiffre de cette page qui coute de l argent :
          reprenez contact avec {data.purchasesUnclaimed > 1 ? 'ces acheteurs' : 'cet acheteur'}.
        </p>
      ) : null}

      <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
          Copies par jour
        </h2>
        <div className="mt-3">
          <DailyColumns days={data.daily} />
        </div>
      </section>

      <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
          Les plus copiés
        </h2>
        <div className="mt-3">
          <BarList
            bars={data.topPrompts.map((prompt) => ({
              key: prompt.promptId,
              label: prompt.command,
              copies: prompt.copies,
            }))}
            empty="Aucune copie sur la periode."
          />
        </div>
      </section>

      <section className="grid gap-3">
        <div className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
            Par domaine
          </h2>
          <div className="mt-3">
            <BarList bars={data.byMode} empty="Aucune copie sur la periode." />
          </div>
        </div>

        <div className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
            Par IA
          </h2>
          <div className="mt-3">
            <BarList bars={data.byProvider} empty="Aucune copie sur la periode." />
          </div>
        </div>

        <div className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
            Depuis quel écran
          </h2>
          <div className="mt-3">
            <BarList bars={data.bySurface} empty="Aucune copie sur la periode." />
          </div>
        </div>
      </section>

      <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        <h2 className="text-[15px] font-medium text-[color:var(--color-night)]">
          {dormant} raccourci{dormant > 1 ? 's' : ''} publie{dormant > 1 ? 's' : ''} sans aucune
          copie
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          Sur {data.promptsPublished} publies, {data.promptsCopied} ont ete copies au moins une fois
          sur la periode. Les autres sont a revoir, a mieux classer, ou a archiver.
        </p>

        {data.unusedPrompts.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {data.unusedPrompts.map((prompt) => (
              <li key={prompt.promptId}>
                <Link
                  href={`/admin/raccourcis/${prompt.promptId}`}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[14px] font-medium text-[color:var(--color-brand)]">
                      {prompt.command}
                    </span>
                    <span className="block truncate text-[12px] text-[color:var(--color-muted)]">
                      {prompt.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] text-[color:var(--color-muted)]">
                    {MODE_LABELS[prompt.mode]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
