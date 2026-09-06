import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
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

export const metadata: Metadata = {
  title: {
    default: 'RaccourcIA \u2014 Vos commandes pour ChatGPT, Claude et Gemini',
    template: '%s | RaccourcIA',
  },
  description:
    'Trouvez la bonne commande, copiez-la et collez-la dans votre IA. ' +
    'Bibliothèque de commandes prêtes à l\u2019emploi, pensée pour le mobile.',
  applicationName: 'RaccourcIA',
  robots: { index: true, follow: true },
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
