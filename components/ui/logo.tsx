/**
 * Mot-symbole RaccourcIA. Le contraste "Raccourc" bleu nuit + "IA" bleu marque
 * doit rester intact (Spec UX/UI V1, section 15).
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-semibold tracking-tight text-[color:var(--color-night)] ${className}`}
      aria-label="RaccourcIA"
    >
      Raccourc<span className="text-[color:var(--color-brand)]">IA</span>
    </span>
  );
}
