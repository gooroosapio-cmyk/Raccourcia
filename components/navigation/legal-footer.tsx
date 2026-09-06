import Link from 'next/link';

/**
 * Pied de page legal.
 *
 * Un produit payant doit rendre ses mentions accessibles depuis chaque page
 * publique : les chercher ne doit jamais etre un exercice.
 */
export function LegalFooter({ className = '' }: { className?: string }) {
  const liens = [
    { href: '/legal/mentions', label: 'Mentions legales' },
    { href: '/legal/confidentialite', label: 'Confidentialite' },
    { href: '/legal/conditions', label: 'Conditions' },
  ];

  return (
    <footer className={`text-[12px] text-[color:var(--color-muted)] ${className}`}>
      <nav aria-label="Informations legales" className="flex flex-wrap gap-x-4 gap-y-1">
        {liens.map((lien) => (
          <Link key={lien.href} href={lien.href} className="underline underline-offset-2">
            {lien.label}
          </Link>
        ))}
      </nav>
      <p className="mt-2">RaccourcIA - bibliotheque de commandes pour ChatGPT, Claude et Gemini.</p>
    </footer>
  );
}
