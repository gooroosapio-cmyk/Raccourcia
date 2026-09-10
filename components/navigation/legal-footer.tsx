import Link from 'next/link';

/**
 * Pied de page legal.
 *
 * Un produit payant doit rendre ses mentions accessibles depuis chaque page
 * publique : les chercher ne doit jamais etre un exercice.
 */
export function LegalFooter({ className = '' }: { className?: string }) {
  const liens = [
    { href: '/legal/mentions', label: 'Mentions légales' },
    { href: '/legal/confidentialite', label: 'Confidentialité' },
    { href: '/legal/conditions', label: 'Conditions' },
  ];

  return (
    <footer className={`text-[12px] text-[color:var(--color-muted)] ${className}`}>
      {/* La marge negative rend la place que la marge interieure prend :
          la zone touchee grandit, le pied de page ne bouge pas d'un pixel.
          Dix-huit pixels de haut, c'etait moins que la pulpe d'un pouce. */}
      <nav aria-label="Informations légales" className="flex flex-wrap gap-x-4 gap-y-1">
        {liens.map((lien) => (
          <Link
            key={lien.href}
            href={lien.href}
            className="-my-1.5 py-1.5 underline underline-offset-2"
          >
            {lien.label}
          </Link>
        ))}
      </nav>
      <p className="mt-2">RaccourcIA — bibliothèque de commandes pour ChatGPT, Claude et Gemini.</p>
    </footer>
  );
}
