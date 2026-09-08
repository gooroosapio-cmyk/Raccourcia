import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';

import { publicEnv } from '@/lib/env';
import './globals.css';

/**
 * Manrope, en variable et auto-hebergee.
 *
 * La police systeme rendait des titres larges et mous : a taille egale,
 * Manrope tient plus de mots par ligne et garde des chiffres alignes, ce dont
 * une interface faite de commandes et de compteurs a besoin. Une seule
 * ressource variable couvre les graisses 400 a 800, `swap` evite l'ecran
 * blanc, et le sous-ensemble latin suffit a une interface francaise.
 */
const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

/**
 * Adresse publique du site, pour rendre absolues les URL de metadonnees.
 *
 * `NEXT_PUBLIC_SITE_URL` vaut `http://localhost:3000` par defaut. Deploye
 * sans cette variable, le visuel de partage pointerait vers la machine de
 * celui qui ouvre le lien : aucune vignette, nulle part, sans le moindre
 * message d'erreur. Vercel expose l'adresse de production, qui sert alors de
 * filet plutot que de laisser passer un lien mort.
 */
function adressePublique(): URL {
  const configuree = publicEnv().NEXT_PUBLIC_SITE_URL;
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (configuree.startsWith('http://localhost') && production) {
    return new URL(`https://${production}`);
  }
  return new URL(configuree);
}

/** Ce que montre la vignette de partage, pour qui ne la voit pas. */
const TEXTE_VIGNETTE =
  'RaccourcIA — La bonne commande, en un geste. Une photo de tasse ordinaire, ' +
  'la bibliothèque de commandes sur un téléphone, puis la même tasse en visuel soigné.';

export const metadata: Metadata = {
  // Sans base, Next ne peut pas rendre absolue l'adresse du visuel de partage :
  // WhatsApp recevrait un chemin relatif et n'afficherait aucune vignette.
  metadataBase: adressePublique(),
  title: {
    default: 'RaccourcIA \u2014 Vos commandes pour ChatGPT, Claude et Gemini',
    template: '%s | RaccourcIA',
  },
  description:
    'Trouvez la bonne commande, copiez-la et collez-la dans votre IA. ' +
    'Bibliothèque de commandes prêtes à l\u2019emploi, pensée pour le mobile.',
  applicationName: 'RaccourcIA',
  robots: { index: true, follow: true },
  // Le visuel de partage vit a la racine (`app/opengraph-image.jpg`) : toute
  // adresse du site partagee dans une conversation affiche la meme vignette,
  // page de vente comprise. Titre et description restent ceux de la page
  // partagee, pas ceux de l'accueil.
  //
  // L'image est declaree ici plutot que laissee a la convention de fichier :
  // le `opengraph-image.alt.txt` voisin n'emet pas `og:image:alt` dans cette
  // version, et une vignette sans texte de remplacement n'est annoncee a
  // personne. Le chemin reste celui de la convention, qui sert le fichier.
  openGraph: {
    type: 'website',
    siteName: 'RaccourcIA',
    locale: 'fr_FR',
    images: [{ url: '/opengraph-image.jpg', width: 1200, height: 630, alt: TEXTE_VIGNETTE }],
  },
  twitter: {
    card: 'summary_large_image',
    images: [{ url: '/opengraph-image.jpg', alt: TEXTE_VIGNETTE }],
  },
};

export const viewport: Viewport = {
  themeColor: '#1463FF',
  width: 'device-width',
  initialScale: 1,
  // L'interface doit rester utilisable avec une augmentation de texte.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={manrope.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
