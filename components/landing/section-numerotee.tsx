/**
 * En-tete de section numerotee.
 *
 * Le numero et l'intitule en petites capitales donnent a la page longue une
 * progression : on sait toujours ou l'on en est, et combien il reste. C'est
 * ce que fait un sommaire, sans en prendre la place.
 *
 * Le numero est decoratif pour la lecture vocale : « 02 » annonce avant un
 * titre n'apprend rien a qui ne voit pas la mise en page, et coupe la phrase
 * en deux.
 */
export function SectionNumerotee({
  numero,
  intitule,
  titre,
  accent,
  intro,
  centre = true,
}: {
  numero: string;
  intitule: string;
  /** Debut du titre, en bleu nuit. */
  titre: string;
  /** Fin du titre, en bleu de marque. Facultative. */
  accent?: string;
  intro?: string;
  centre?: boolean;
}) {
  return (
    <div className={`max-w-2xl ${centre ? 'mx-auto text-center' : ''}`}>
      <p className="flex items-center gap-2.5 text-[length:var(--texte-carte)] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
        {centre ? <span className="flex-1" /> : null}
        <span aria-hidden="true" className="text-[color:var(--color-brand)]">
          {numero}
        </span>
        <span>{intitule}</span>
        {centre ? <span className="flex-1" /> : null}
      </p>

      <h2 className="mt-3 text-[28px] font-bold leading-[1.14] tracking-tight text-[color:var(--color-night)] sm:text-[38px]">
        {titre}
        {accent ? <span className="text-[color:var(--color-brand)]">{accent}</span> : null}
      </h2>

      {intro ? (
        <p className="mt-4 text-[length:var(--texte-corps)] leading-[1.65] text-[color:var(--color-muted)] sm:text-[17px]">
          {intro}
        </p>
      ) : null}
    </div>
  );
}
