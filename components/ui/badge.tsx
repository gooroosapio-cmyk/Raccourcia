/** Badge compact. Jamais plus de deux par carte (Spec UX/UI, 8). */
export function Badge({
  children,
  tone = 'neutre',
}: {
  children: React.ReactNode;
  tone?: 'neutre' | 'premium' | 'nouveau';
}) {
  const tones = {
    neutre: 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]',
    premium: 'bg-[#FFF3E0] text-[color:var(--color-warning)]',
    nouveau: 'bg-[color:var(--color-brand)] text-white',
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
