/**
 * Badge d'acces ou de nouveaute. Un seul par carte : deux badges se disputent
 * l'attention et aucun des deux n'est lu (Spec UX/UI, 8).
 *
 * Le ton "membre" a sa propre teinte ambre, distincte de l'ambre d'alerte :
 * "reserve aux membres" est une information commerciale, pas un avertissement.
 */
export function Badge({
  children,
  tone = 'neutre',
  icon,
}: {
  children: React.ReactNode;
  tone?: 'neutre' | 'premium' | 'nouveau' | 'gratuit';
  icon?: React.ReactNode;
}) {
  const tones = {
    neutre: 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]',
    premium: 'bg-[color:var(--color-member-soft)] text-[color:var(--color-member)]',
    nouveau: 'bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-strong)]',
    gratuit: 'bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]',
  } as const;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold ${tones[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
