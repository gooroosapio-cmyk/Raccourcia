import Link from 'next/link';

export type Offre = {
  purchaseUrl: string;
  price: { current: number; regular: number | null; currency: string };
};

/**
 * Argumentaire de l'acces a vie.
 *
 * Un seul composant sert la page dediee et la fenetre contextuelle : deux
 * argumentaires distincts finiraient par diverger, et l'un des deux serait
 * faux.
 *
 * Le prix et le lien d'achat viennent de la configuration, jamais du code.
 * Aucun compteur d'acheteurs, aucun temoignage, aucune rarete artificielle.
 *
 * Et plus aucun decompte du catalogue : annoncer « 252 commandes » engage a
 * les avoir, oblige a corriger la phrase a chaque publication, et vieillit
 * mal entre deux deploiements. Ce que l'offre promet est plus simple et
 * reste vrai — tout le catalogue, nouveautes comprises. Ces chiffres
 * existent toujours, dans l'administration, ou ils servent a piloter.
 */
export function UpgradePanel({
  offre,
  compact = false,
  titrePrincipal = false,
}: {
  offre: Offre;
  compact?: boolean;
  /** Vrai lorsque ce panneau porte le titre de la page qui l'affiche. */
  titrePrincipal?: boolean;
}) {
  const avantages = [
    {
      titre: 'Toutes les commandes',
      corps: 'Le catalogue entier, en Image et en Texte, sans exception.',
    },
    {
      titre: 'Nouveautés incluses',
      corps: 'Les commandes ajoutées ensuite sont comprises, sans rien repayer.',
    },
    {
      titre: 'Accès immédiat',
      corps: 'Jusqu’à 3 appareils avec le même compte, favoris et historique compris.',
    },
  ];

  return (
    <div className={compact ? undefined : 'text-center'}>
      {!compact ? <Halo /> : null}

      {/* Ce panneau sert deux endroits : la page d'offre, ou cette phrase
          est le titre de la page, et la feuille du paywall, ou elle est un
          titre parmi d'autres dans un ecran deja titre. Le niveau suit donc
          l'endroit, jamais l'apparence. */}
      <Titre
        principal={titrePrincipal}
        className={`font-semibold text-[color:var(--color-night)] ${
          compact ? 'text-[20px]' : 'text-[30px] leading-tight'
        }`}
      >
        Tout RaccourcIA, sans limites.
      </Titre>
      <p
        className={`mt-2 leading-relaxed text-[color:var(--color-muted)] ${
          compact ? 'text-[14px]' : 'mx-auto max-w-[38ch] text-[16px]'
        }`}
      >
        Certaines commandes se copient librement. L’accès à vie ouvre tout le catalogue, en un seul
        paiement.
      </p>

      <ul className={`mt-5 space-y-3 ${compact ? '' : 'text-left'}`}>
        {avantages.map((avantage) => (
          <li key={avantage.titre} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-success-soft)]">
              <CheckIcon />
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-[color:var(--color-night)]">
                {avantage.titre}
              </span>
              <span className="block text-[13px] leading-relaxed text-[color:var(--color-muted)]">
                {avantage.corps}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <PriceTag price={offre.price} />

      <a
        href={offre.purchaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] text-[16px] font-semibold text-white transition-[background-color,transform] duration-[var(--duration-fast)] hover:bg-[color:var(--color-brand-strong)] active:scale-[0.99]"
      >
        Passer en Premium
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 12h13m0 0-5-5m5 5-5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>

      {/* Deja acheteur : il lui manque seulement d'activer sa licence. */}
      <Link
        href="/activation"
        className="mt-2 flex h-12 w-full items-center justify-center text-[14px] font-medium text-[color:var(--color-brand)] underline underline-offset-2"
      >
        J’ai déjà un accès
      </Link>
    </div>
  );
}

/**
 * Prix. Le montant de reference n'est barre que si la configuration en
 * declare un reellement superieur : une remise inventee serait mensongere.
 */
function PriceTag({ price }: { price: Offre['price'] }) {
  if (price.current <= 0) return null;

  const format = (valeur: number) => new Intl.NumberFormat('fr-FR').format(valeur);

  return (
    <div className="mt-5 flex items-baseline justify-center gap-2.5 rounded-[color:var(--radius-card)] bg-[color:var(--color-sky)] px-4 py-3">
      {price.regular ? (
        <span className="text-[16px] text-[color:var(--color-muted)] line-through">
          {format(price.regular)} {price.currency}
        </span>
      ) : null}
      <span className="text-[26px] font-semibold text-[color:var(--color-night)]">
        {format(price.current)} {price.currency}
      </span>
      <span className="text-[13px] text-[color:var(--color-muted)]">une fois</span>
    </div>
  );
}

/** Unique decoration de marque : un halo bleu tres pale derriere le cadenas. */
function Halo() {
  return (
    <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-[color:var(--color-brand)]/12 blur-xl"
      />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand)]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="4" y="10" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
          <path
            d="M8 10V7a4 4 0 0 1 8 0v3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 13 4 4L19 7"
        stroke="var(--color-success)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** `h1` quand le panneau titre la page, `h2` quand il vit dans une feuille. */
function Titre({
  principal,
  className,
  children,
}: {
  principal: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return principal ? (
    <h1 className={className}>{children}</h1>
  ) : (
    <h2 className={className}>{children}</h2>
  );
}
