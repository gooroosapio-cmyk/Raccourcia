import Link from 'next/link';
import { getAccessState } from '@/lib/access/entitlement';
import { getCatalogCounts, getPublicConfig } from '@/lib/catalog/queries';
import { UpgradePanel } from '@/components/paywall/upgrade-panel';

export const metadata = {
  title: 'Accès à vie',
  description: 'Toutes les commandes RaccourcIA, en un seul paiement.',
};

/**
 * Page de l'acces a vie.
 *
 * Elle reste courte : un visiteur qui arrive ici a deja vu le catalogue, il
 * lui manque le prix et la certitude de ce qu'il obtient, pas un argumentaire
 * de vente.
 */
export default async function OfferPage() {
  const [config, counts, { hasLifetimeAccess }] = await Promise.all([
    getPublicConfig(),
    getCatalogCounts(),
    getAccessState(),
  ]);

  return (
    <div className="pt-4">
      {hasLifetimeAccess ? (
        <div className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 text-center">
          <p className="text-[17px] font-semibold text-[color:var(--color-night)]">
            Votre accès est déjà actif.
          </p>
          <p className="mt-1 text-[14px] text-[color:var(--color-muted)]">
            Toutes les commandes vous sont ouvertes.
          </p>
          <Link
            href="/app"
            className="mt-4 inline-flex h-13 items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-5 text-[15px] font-semibold text-white"
          >
            Ouvrir la bibliothèque
          </Link>
        </div>
      ) : (
        <UpgradePanel
          titrePrincipal
          offre={{
            purchaseUrl: config.purchaseUrl,
            price: config.price,
            freeCount: counts.free,
            totalCount: counts.total,
          }}
        />
      )}

      <p className="mt-8 text-center text-[12px] leading-relaxed text-[color:var(--color-muted)]">
        L’accès à vie est personnel et non transférable.{' '}
        <Link href="/legal/conditions" className="underline underline-offset-2">
          Conditions générales
        </Link>{' '}
        et{' '}
        <Link href="/legal/confidentialite" className="underline underline-offset-2">
          politique de confidentialité
        </Link>
        .
      </p>
    </div>
  );
}
