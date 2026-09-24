import Link from 'next/link';

/**
 * Les deux pages d'Organisation : categories et tags. Elles rangent toutes
 * deux le catalogue ; l'onglet dit laquelle on regarde.
 */
export function OngletsOrganisation({ actif }: { actif: 'categories' | 'tags' }) {
  const onglets = [
    { cle: 'categories' as const, href: '/admin/categories', libelle: 'Catégories et collections' },
    { cle: 'tags' as const, href: '/admin/tags', libelle: 'Tags' },
  ];
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Organisation</h1>
      <nav
        aria-label="Organisation"
        className="inline-flex rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-0.5"
      >
        {onglets.map((onglet) => (
          <Link
            key={onglet.cle}
            href={onglet.href}
            aria-current={onglet.cle === actif ? 'page' : undefined}
            className={`flex min-h-11 items-center rounded-[10px] px-3 text-[14px] font-medium ${
              onglet.cle === actif
                ? 'bg-[color:var(--color-brand)] text-white'
                : 'text-[color:var(--color-muted)]'
            }`}
          >
            {onglet.libelle}
          </Link>
        ))}
      </nav>
    </div>
  );
}
