import Link from 'next/link';

/**
 * « Tout / Gratuits » et « Pertinence / Recentes », au-dessus d'une liste.
 *
 * Des liens et non des boutons : chaque reglage est une adresse, qu'on peut
 * partager ou retrouver avec le bouton Retour, et le serveur rend la liste
 * deja triee. Le reglage actif se voit et s'annonce (`aria-current`).
 */
export function ReglagesDeListe({
  base,
  gratuits,
  recentes,
}: {
  /** L'adresse de la liste, sans parametre. */
  base: string;
  gratuits: boolean;
  recentes: boolean;
}) {
  const adresse = (options: { gratuits: boolean; recentes: boolean }) => {
    const parametres = new URLSearchParams();
    if (options.gratuits) parametres.set('acces', 'gratuit');
    if (options.recentes) parametres.set('tri', 'recentes');
    const chaine = parametres.toString();
    return chaine ? `${base}?${chaine}` : base;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Segment
        libelle="Accès"
        options={[
          { texte: 'Tout', href: adresse({ gratuits: false, recentes }), actif: !gratuits },
          { texte: 'Gratuits', href: adresse({ gratuits: true, recentes }), actif: gratuits },
        ]}
      />
      <Segment
        libelle="Tri"
        options={[
          { texte: 'Pertinence', href: adresse({ gratuits, recentes: false }), actif: !recentes },
          { texte: 'Récentes', href: adresse({ gratuits, recentes: true }), actif: recentes },
        ]}
      />
    </div>
  );
}

function Segment({
  libelle,
  options,
}: {
  libelle: string;
  options: { texte: string; href: string; actif: boolean }[];
}) {
  return (
    <nav
      aria-label={libelle}
      className="inline-flex rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-0.5"
    >
      {options.map((option) => (
        <Link
          key={option.texte}
          href={option.href}
          scroll={false}
          aria-current={option.actif ? 'page' : undefined}
          className={`flex min-h-11 items-center rounded-[10px] px-3 text-[length:var(--texte-carte)] font-medium transition-colors duration-[var(--duration-fast)] ${
            option.actif
              ? 'bg-[color:var(--color-brand)] text-white'
              : 'text-[color:var(--color-muted)]'
          }`}
        >
          {option.texte}
        </Link>
      ))}
    </nav>
  );
}
