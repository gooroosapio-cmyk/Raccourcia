import Link from 'next/link';
import { getAccessState } from '@/lib/access/entitlement';
import { getProfile, listSessions } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { CONFIG_FALLBACKS, CONFIG_KEYS } from '@/lib/constants';
import { DeviceList } from '@/app/(member)/compte/device-list';
import { SignOutButton } from '@/app/(member)/compte/sign-out-button';
import { LegalFooter } from '@/components/navigation/legal-footer';

export const metadata = { title: 'Compte' };

export default async function AccountPage() {
  const [profile, access, sessions] = await Promise.all([
    getProfile(),
    getAccessState(),
    listSessions(),
  ]);

  // La limite d'appareils est une valeur de configuration, pas une constante
  // figee : elle se change depuis /admin.
  const supabase = await createClient();
  const { data: config } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', CONFIG_KEYS.MAX_ACTIVE_SESSIONS)
    .maybeSingle();
  const maxSessions =
    typeof config?.value === 'number'
      ? config.value
      : CONFIG_FALLBACKS[CONFIG_KEYS.MAX_ACTIVE_SESSIONS];

  return (
    <div className="space-y-6 pt-1">
      <h1 className="text-[28px] font-semibold text-[color:var(--color-night)]">Compte</h1>

      <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
          Mon acces
        </h2>
        {access.hasLifetimeAccess ? (
          <p className="mt-2 flex items-center gap-2 text-[15px] font-medium text-[color:var(--color-success)]">
            <span aria-hidden="true">✓</span> Votre acces est actif a vie.
          </p>
        ) : (
          <>
            <p className="mt-2 text-[15px] font-medium text-[color:var(--color-night)]">
              Aucun acces actif.
            </p>
            <p className="mt-1 text-[13px] text-[color:var(--color-muted)]">
              Activez votre achat pour copier toutes les commandes.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/offre"
                className="inline-flex h-12 items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-4 text-[15px] font-semibold text-white"
              >
                Voir l offre
              </Link>
              <Link
                href="/activation"
                className="inline-flex h-12 items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] px-4 text-[15px] font-medium text-[color:var(--color-night)]"
              >
                J ai deja achete
              </Link>
            </div>
          </>
        )}
        {profile ? (
          <p className="mt-3 text-[13px] text-[color:var(--color-muted)]">{profile.email}</p>
        ) : null}
      </section>

      <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
          Mes appareils
        </h2>
        <p className="mt-1 text-[13px] text-[color:var(--color-muted)]">
          {sessions.length} appareil{sessions.length > 1 ? 's' : ''} connecte
          {sessions.length > 1 ? 's' : ''} sur {maxSessions} possibles.
        </p>
        <DeviceList sessions={sessions} />
        {sessions.length > maxSessions ? (
          <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-warning)]">
            Vous avez atteint la limite. Deconnectez un appareil pour en ajouter un autre.
          </p>
        ) : null}
      </section>

      <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
          Securite
        </h2>
        <Link
          href="/recuperation"
          className="mt-2 inline-block text-[15px] font-medium text-[color:var(--color-brand)]"
        >
          Modifier mon mot de passe
        </Link>
      </section>

      <SignOutButton />

      <LegalFooter className="pt-2" />
    </div>
  );
}
