import type { NextConfig } from 'next';
import { COLLECTIONS_RENOMMEES } from './lib/catalog/collections-renommees';

/**
 * En-tetes de securite appliques a toutes les reponses.
 * Reference: Document Technique V1, section 17.2.
 * La CSP reste volontairement stricte : aucune ressource tierce n'est requise en V1.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    // `/storage/v1/**` couvre les deux formes d'adresse : le fichier
    // d'origine (`object/public`) et le rendu redimensionne par le stockage
    // (`render/image/public`), que les visuels du catalogue utilisent.
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/**' }]
      : [],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Le rangement des rayons a renomme des collections, donc leurs adresses.
  // Un lien partage avant la refonte continue de mener au bon endroit plutot
  // que sur un « introuvable » que personne ne saurait interpreter.
  async redirects() {
    return Object.entries(COLLECTIONS_RENOMMEES).map(([avant, apres]) => ({
      source: `/app/bibliotheque/${avant}`,
      destination: `/app/bibliotheque/${apres}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
