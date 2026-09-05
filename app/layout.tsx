import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'RaccourcIA - Vos raccourcis pour ChatGPT, Claude et Gemini',
    template: '%s | RaccourcIA',
  },
  description:
    'Trouvez le bon raccourci, copiez le prompt complet et collez-le dans votre IA. ' +
    'Bibliotheque de commandes pretes a l emploi, pensee pour le mobile.',
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
    <html lang="fr">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
