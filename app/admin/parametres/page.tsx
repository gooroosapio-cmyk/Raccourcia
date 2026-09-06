import { listAdminConfig } from '@/lib/admin/queries';
import { ConfigForm } from '@/app/admin/parametres/config-forms';

export const metadata = { title: 'Parametres' };

/**
 * Reglages modifiables sans redeploiement.
 *
 * Les libelles parlent le vocabulaire du produit, jamais celui de la table :
 * l'administrateur lit "Prix affiche", pas "price_current".
 */
const LABELS: Record<string, string> = {
  mode_analyse_enabled: 'Mode Analyse (sans effet depuis le catalogue v2)',
  public_catalog_enabled: 'Pages publiques partageables',
  max_active_sessions: 'Appareils connectes par compte',
  free_prompt_limit: 'Commandes gratuites de demonstration',
  purchase_url: 'Page de vente',
  price_regular: 'Prix de reference (barre)',
  price_current: 'Prix affiche',
  price_currency: 'Devise',

  legal_editor: 'Editeur : raison sociale',
  legal_editor_form: 'Editeur : forme juridique',
  legal_capital: 'Editeur : capital',
  legal_registration: 'Editeur : RCCM',
  legal_address: 'Editeur : adresse du siege',
  legal_representative: 'Editeur : representant legal',
  legal_publication_director: 'Directeur de la publication',
  legal_host: 'Hebergeur : nom',
  legal_host_address: 'Hebergeur : adresse',
  legal_host_contact: 'Hebergeur : contact',
  legal_contact_email: 'Contact general',
  legal_privacy_email: 'Contact donnees personnelles',
  legal_support_email: 'Contact support',
  legal_payment_provider: 'Prestataire de paiement',
  legal_refund_policy: 'Regles de remboursement',
  legal_retention_account: 'Conservation : donnees de compte',
  legal_retention_support: 'Conservation : demandes de support',
  legal_retention_logs: 'Conservation : journaux de securite',
  legal_updated_at: 'Date de version du cadre legal',
};

/**
 * Trois groupes plutot qu'une liste unique de trente reglages : le prix ne se
 * cherche pas au milieu des durees de conservation.
 */
const GROUPES = [
  {
    titre: 'Service',
    description: 'Prennent effet immediatement, sans nouvelle mise en ligne.',
    test: (cle: string) => !cle.startsWith('legal_') && !cle.startsWith('price_'),
  },
  {
    titre: 'Offre',
    description:
      'Le prix affiche doit correspondre a la fiche produit Chariow. Un prix de reference inferieur ou egal au prix affiche n est pas barre.',
    test: (cle: string) => cle.startsWith('price_'),
  },
  {
    titre: 'Cadre legal',
    description:
      'Ces informations alimentent les mentions legales, la politique de confidentialite et les conditions. Un champ vide s affiche publiquement comme "a completer".',
    test: (cle: string) => cle.startsWith('legal_'),
  },
];

export default async function AdminSettingsPage() {
  const entries = await listAdminConfig();
  const manquants = entries.filter(
    (entry) => entry.key.startsWith('legal_') && entry.value.trim() === '',
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Parametres</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          Ces reglages prennent effet immediatement, sans nouvelle mise en ligne.
        </p>
      </div>

      {manquants > 0 ? (
        <p className="rounded-[color:var(--radius-control)] bg-[color:var(--color-member-soft)] px-3 py-2.5 text-[13px] leading-relaxed text-[color:var(--color-member)]">
          {manquants} information{manquants > 1 ? 's' : ''} legale{manquants > 1 ? 's' : ''} reste
          {manquants > 1 ? 'nt' : ''} a renseigner. Les pages publiques le signalent explicitement
          tant que c est le cas.
        </p>
      ) : null}

      {entries.length === 0 ? (
        <p className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 text-center text-[15px] text-[color:var(--color-muted)]">
          Aucun parametre disponible.
        </p>
      ) : (
        GROUPES.map((groupe) => {
          const lignes = entries.filter((entry) => groupe.test(entry.key));
          if (lignes.length === 0) return null;

          return (
            <section key={groupe.titre}>
              <h2 className="text-[15px] font-semibold text-[color:var(--color-night)]">
                {groupe.titre}
              </h2>
              <p className="mb-3 mt-1 text-[12px] leading-relaxed text-[color:var(--color-muted)]">
                {groupe.description}
              </p>
              <div className="space-y-3">
                {lignes.map((entry) => (
                  <ConfigForm
                    key={entry.key}
                    entry={entry}
                    label={LABELS[entry.key] ?? entry.key}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
