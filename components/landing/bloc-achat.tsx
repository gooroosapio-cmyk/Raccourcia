import { Button, FlecheIcone } from '@/components/landing/button';

/**
 * Moyens de paiement annonces sous le bouton d'achat.
 *
 * Ce sont ceux que la boutique elle-meme annonce, et rien de plus. Ajouter un
 * operateur « parce qu'il est courant dans la region » ferait venir quelqu'un
 * pour un moyen qu'il ne trouverait pas au moment de payer — la deception
 * arriverait exactement au pire endroit du parcours.
 *
 * Des noms, pas des logos : les marques appartiennent a leurs proprietaires,
 * et une pastille grise mal redessinee ne rassure personne.
 */
const MOYENS = ['Mobile Money', 'Wave', 'Visa'];

export function MoyensPaiement({ centre = true }: { centre?: boolean }) {
  return (
    <div className={centre ? 'text-center' : ''}>
      <ul
        className={`flex flex-wrap items-center gap-2 ${centre ? 'justify-center' : ''}`}
        aria-label="Moyens de paiement acceptés"
      >
        {MOYENS.map((moyen) => (
          <li
            key={moyen}
            className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-1.5 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-night)]"
          >
            {moyen}
          </li>
        ))}
        <li className="text-[length:var(--texte-carte)] text-[color:var(--color-muted)]">
          et les autres moyens proposés au paiement
        </li>
      </ul>
    </div>
  );
}

/**
 * Bloc d'achat complet : bouton, ligne de reassurance, moyens de paiement.
 *
 * Un seul composant pour les trois endroits ou il apparait — l'accueil,
 * l'offre, l'appel final. Trois copies auraient fini par diverger, et c'est
 * le prix qui aurait diverge en premier.
 */
export function BlocAchat({
  purchaseUrl,
  prix,
  libelle,
  secondaire = true,
  sombre = false,
}: {
  purchaseUrl: string;
  prix: string;
  /** Ce que le bouton promet. Le prix est ajoute ensuite, toujours visible. */
  libelle: string;
  /** Faux quand la page a deja propose la bibliotheque juste au-dessus. */
  secondaire?: boolean;
  /** Vrai sur fond bleu nuit : le bouton de contour passe en clair. */
  sombre?: boolean;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button href={purchaseUrl} externe pleineLargeur className="sm:w-auto">
          {libelle} — {prix}
          <FlecheIcone />
        </Button>

        {secondaire ? (
          sombre ? (
            <a
              href="/app"
              className="inline-flex h-[52px] items-center justify-center rounded-[14px] border border-white/25 px-6 text-[16px] font-semibold text-white transition-colors duration-[var(--duration-fast)] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Découvrir les commandes
            </a>
          ) : (
            <Button href="/app" ton="contour" pleineLargeur className="sm:w-auto">
              Découvrir les commandes
            </Button>
          )
        ) : null}
      </div>

      <p
        className={`mt-3 text-center text-[length:var(--texte-carte)] ${
          sombre ? 'text-white/70' : 'text-[color:var(--color-muted)]'
        }`}
      >
        Accès à vie · Paiement unique · Accès immédiat après validation
      </p>

      {sombre ? null : (
        <div className="mt-4">
          <MoyensPaiement />
        </div>
      )}
    </div>
  );
}
