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
      {/* 44 px de cible, comme partout ailleurs : dix-huit pixels de haut,
          c'etait moins que la pulpe d'un pouce. */}
      <nav aria-label="Informations légales" className="flex flex-wrap gap-x-4">
        {liens.map((lien) => (
          <Link
            key={lien.href}
            href={lien.href}
            className="inline-flex min-h-11 min-w-11 items-center underline underline-offset-2"
          >
            {lien.label}
          </Link>
        ))}
      </nav>
      <p className="mt-2">RaccourcIA — bibliothèque de commandes prêtes à copier.</p>
    </footer>
  );
}
