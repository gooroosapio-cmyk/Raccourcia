import { listAdminConfig } from '@/lib/admin/queries';
import { ConfigForm } from '@/app/admin/parametres/config-forms';

export const metadata = { title: 'Parametres' };

/**
 * Reglages modifiables sans redeploiement.
 *
 * Les libelles parlent le vocabulaire du produit, jamais celui de la table :
 * l'administrateur lit "Mode Analyse", pas "mode_analyse_enabled".
 */
const LABELS: Record<string, string> = {
  mode_analyse_enabled: 'Mode Analyse',
  public_catalog_enabled: 'Pages publiques partageables',
  max_active_sessions: 'Appareils connectes par compte',
  free_prompt_limit: 'Raccourcis gratuits de demonstration',
};

export default async function AdminSettingsPage() {
  const entries = await listAdminConfig();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Parametres</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          Ces reglages prennent effet immediatement, sans nouvelle mise en ligne.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 text-center text-[15px] text-[color:var(--color-muted)]">
          Aucun parametre disponible.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <ConfigForm key={entry.key} entry={entry} label={LABELS[entry.key] ?? entry.key} />
          ))}
        </div>
      )}
    </div>
  );
}
