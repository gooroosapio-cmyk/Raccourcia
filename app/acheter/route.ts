import { redirect } from 'next/navigation';
import { getPublicConfig } from '@/lib/catalog/queries';

/**
 * Porte d'achat interne.
 *
 * Les pages pointent ici plutot que directement sur la boutique. Deux raisons,
 * dans cet ordre :
 *
 * 1. Le nom du prestataire de paiement n'apparait alors nulle part dans le
 *    code d'une page publique — il ne se lit ni dans un lien survole, ni dans
 *    la source, ni dans un lien copie puis partage.
 * 2. L'adresse de la boutique vit deja en configuration : une seule porte a
 *    franchir signifie un seul endroit a changer le jour ou elle bouge, et
 *    des liens deja poses qui continuent de fonctionner.
 *
 * Aucune donnee n'est journalisee ici : cette route ne fait que conduire.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const { purchaseUrl } = await getPublicConfig();
  redirect(purchaseUrl);
}
