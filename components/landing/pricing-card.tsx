import { Button, FlecheIcone } from '@/components/landing/button';
import { MoyensPaiement, Prix } from '@/components/landing/bloc-achat';

/**
 * Carte de l'offre.
 *
 * Un seul prix, aucun montant barre, aucun compte a rebours. Ce qui rassure
 * ici n'est pas la remise mais la clarte : ce qu'on paie, une fois, et ce
 * qu'on obtient — enonce avant le bouton, pas apres.
 *
 * Les elements inclus sont ceux de l'offre actuelle et rien d'autre. Une
 * ligne « mises a jour incluses » serait une promesse que personne n'a
 * prise.
 */
export function PricingCard({
  prix,
  prixReference,
  purchaseUrl,
  inclus,
}: {
  /** Montant deja formate, unite comprise. */
  prix: string;
  /** Montant de reference, barre a cote. `null` s'il n'est pas superieur. */
  prixReference: string | null;
  purchaseUrl: string;
  inclus: string[];
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-raised)]">
      <div className="border-b border-[color:var(--color-line)] bg-[color:var(--color-sky)]/60 px-6 py-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-surface)] px-3 py-1.5 text-[length:var(--texte-carte)] font-semibold text-[color:var(--color-brand)]">
          <CouronneIcone />
          Accès à vie
        </span>
        {prixReference ? (
          <p className="mt-4 text-[17px] text-[color:var(--color-muted)] line-through">
            {prixReference}
          </p>
        ) : null}
        <p
          className={`text-[40px] font-bold leading-none tracking-tight text-[color:var(--color-night)] ${
            prixReference ? 'mt-1' : 'mt-4'
          }`}
        >
          {prix}
        </p>
        <p className="mt-2 text-[length:var(--texte-corps)] text-[color:var(--color-muted)]">
          Paiement unique
        </p>
      </div>

      <div className="px-6 py-6">
        <ul className="flex flex-col gap-3">
          {inclus.map((element) => (
            <li key={element} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-success-soft)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m5 13 4 4L19 7"
                    stroke="var(--color-success)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-[length:var(--texte-corps)] leading-[1.5] text-[color:var(--color-night)]">
                {element}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2.5">
          <Button href={purchaseUrl} externe pleineLargeur>
            Accès à vie — <Prix courant={prix} reference={prixReference} />
            <FlecheIcone />
          </Button>
          <Button href="/app" ton="contour" pleineLargeur>
            Découvrir les commandes
          </Button>
        </div>

        <div className="mt-5">
          <MoyensPaiement />
        </div>

        <p className="mt-4 text-center text-[length:var(--texte-meta)] leading-relaxed text-[color:var(--color-muted)]">
          Le prix, le contenu de l’accès et les modalités sont affichés avant validation.
        </p>
      </div>
    </div>
  );
}

function CouronneIcone() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8.5 7.5 12 12 5.5 16.5 12 20 8.5V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
