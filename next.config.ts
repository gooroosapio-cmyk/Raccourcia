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
    // L'OPTIMISEUR DE L'HEBERGEUR EST COUPE, ET C'EST TOUT L'ENJEU DE CE
    // FICHIER.
    //
    // Le stockage rend deja chaque visuel a la largeur utile — c'est ce que
    // fait `lib/media/url.ts`, sans quota et derriere son propre cache. Le
    // faire repasser par l'optimiseur de l'hebergeur n'ajoute donc rien,
    // sinon une dependance a un compteur mensuel : ce compteur epuise,
    // l'optimiseur repond « Payment Required » et l'image ne s'affiche plus
    // du tout.
    //
    // La regle etait jusqu'ici posee carte par carte, par une propriete
    // `unoptimized` recopiee a la main. Quatre appels l'avaient, sept ne
    // l'avaient pas : les tuiles de l'accueil, les trois visuels de
    // Decouvrir et la mosaique de la Bibliotheque montraient une image
    // cassee pendant que la galerie, elle, s'affichait. Une regle qui se
    // recopie est une regle qu'on oublie au prochain appel ; elle vit donc
    // ici, une fois, pour tout le monde.
    //
    // Les fichiers locaux ne perdent rien : `public/landing/*` est deja en
    // webp et le plus lourd pese 160 ko.
    unoptimized: true,
    // Conserve bien que l'optimiseur soit coupe : c'est la liste des hotes
    // autorises le jour ou l'on voudrait le rallumer, et elle dit d'ou les
    // visuels ont le droit de venir. `/storage/v1/**` couvre les deux formes
    // d'adresse : le fichier d'origine (`object/public`) et le rendu
    // redimensionne par le stockage (`render/image/public`).
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
