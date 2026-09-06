import { findMembers } from '@/lib/admin/queries';
import { MemberAccessForm } from '@/app/admin/membres/member-access';

export const metadata = { title: 'Membres' };

/**
 * Support : retrouver un compte et debloquer un acces.
 *
 * La recherche est un formulaire GET classique : elle fonctionne meme sans
 * JavaScript et l'URL reste partageable.
 */
export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = typeof params.q === 'string' ? params.q : '';

  const members = await findMembers(search);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Membres</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          Retrouvez un compte par son adresse e-mail pour vérifier ou debloquer son accès.
        </p>
      </div>

      <form action="/admin/membres" className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Rechercher un compte</span>
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Adresse e-mail..."
            className="h-11 w-full rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)] px-3 text-[15px] outline-none placeholder:text-[color:var(--color-muted)]"
          />
        </label>
        <button
          type="submit"
          className="touch-target shrink-0 rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-4 text-sm font-medium text-white"
        >
          Chercher
        </button>
      </form>

      {members.length === 0 ? (
        <p className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 text-center text-[15px] text-[color:var(--color-muted)]">
          {search
            ? 'Aucun compte ne correspond à cette recherche.'
            : 'Aucun compte pour l’instant.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-[color:var(--color-night)]">
                    {member.email}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[color:var(--color-muted)]">
                    Inscrit le{' '}
                    {new Date(member.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {member.activeSessions > 0
                      ? ` - ${member.activeSessions} appareil${member.activeSessions > 1 ? 's' : ''} connecte${member.activeSessions > 1 ? 's' : ''}`
                      : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${
                    member.hasAccess
                      ? 'bg-[#E9F7EF] text-[color:var(--color-success)]'
                      : 'bg-[color:var(--color-canvas)] text-[color:var(--color-muted)]'
                  }`}
                >
                  {member.hasAccess ? 'Accès à vie' : 'Sans accès'}
                </span>
              </div>

              <MemberAccessForm userId={member.id} hasAccess={member.hasAccess} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
