import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { LegalFooter } from '@/components/navigation/legal-footer';
import { getPublicConfig } from '@/lib/catalog/queries';

/**
 * Accueil public. Il montre la valeur avant le verrou : le contenu complet
 * d'une commande n'apparait jamais ici (Spec UX/UI V1, section 10).
 *
 * Tout tient dans un ecran de telephone, sans defilement autour de 800 px de
 * hauteur. Une page d'accueil qu'il faut faire defiler pour trouver son bouton
 * d'entree demande un effort avant d'avoir rien promis : ici la promesse, la
 * preuve et l'entree sont visibles ensemble.
 *
 * Les benefices sont trois lignes et non trois cartes : une carte par benefice
 * occupait a elle seule la place des trois, et repoussait le bouton hors de
 * l'ecran.
 */
export default async function LandingPage() {
  const config = await getPublicConfig();

  const benefices = [
    {
      titre: 'Trouver',
      corps: 'Des commandes prêtes à l’emploi, classees par cas d’usage.',
      icone: <SearchIcon />,
    },
    {
      titre: 'Comprendre',
      corps: 'Des exemples concrets pour un meilleur résultat.',
      icone: <BulbIcon />,
    },
    {
      titre: 'Copier',
      corps: 'Une commande, un geste, prête à l’emploi.',
      icone: <CopyIcon />,
    },
  ];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col px-4 pb-4 pt-3 lg:max-w-4xl">
      <header className="flex items-center justify-between">
        <Logo className="text-[19px]" />
        <Link
          href="/connexion"
          className="touch-target inline-flex items-center rounded-[color:var(--radius-control)] px-2 text-[length:var(--texte-corps)] font-medium text-[color:var(--color-brand)]"
        >
          Se connecter
        </Link>
      </header>

      <section className="relative mt-5">
        <p className="text-[length:var(--texte-carte)] font-semibold text-[color:var(--color-brand)]">
          Accès à vie, paiement unique
        </p>
        <h1 className="mt-1.5 text-[length:var(--texte-heros)] font-bold leading-[1.12] tracking-tight text-[color:var(--color-night)]">
          Le bon prompt,
          <br />
          en un geste.
        </h1>
        <p className="mt-2.5 max-w-[40ch] text-[length:var(--texte-corps)] leading-[1.5] text-[color:var(--color-muted)]">
          Choisissez une commande, utilisez-la dans ChatGPT, Claude ou Gemini et obtenez un meilleur
          resultat. Rien a configurer, rien a retenir.
        </p>

        {/*
         * `anim-appel` joue deux allers-retours d'un pixel et demi, une seule
         * fois, une seconde et demie apres le chargement : le temps que la
         * page se pose et que l'oeil ait lu le titre. Une boucle permanente
         * ferait publicite. Le mode « mouvement reduit » la neutralise, comme
         * toutes les animations du projet.
         */}
        <Link
          href="/app"
          className="anim-appel mt-5 flex h-[51px] w-full items-center justify-center gap-2 rounded-[14px] bg-[color:var(--color-brand)] text-[length:var(--texte-corps)] font-semibold text-white shadow-[0_2px_10px_rgb(20_99_255_/_0.22)] transition-[background-color,transform] duration-[var(--duration-fast)] hover:bg-[color:var(--color-brand-strong)] active:scale-[0.985] sm:w-auto sm:px-8"
        >
          Découvrir les commandes
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12h13m0 0-5-5m5 5-5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </section>

      <section className="mt-6 space-y-1.5">
        {benefices.map((benefice) => (
          <article
            key={benefice.titre}
            className="flex items-center gap-3 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2.5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[color:var(--color-sky)] text-[color:var(--color-brand)]">
              {benefice.icone}
            </span>
            <span className="min-w-0">
              <h2 className="text-[length:var(--texte-carte)] font-bold text-[color:var(--color-night)]">
                {benefice.titre}
              </h2>
              <p className="text-[length:var(--texte-meta)] leading-[1.35] text-[color:var(--color-muted)]">
                {benefice.corps}
              </p>
            </span>
          </article>
        ))}
      </section>

      <p className="mt-4 text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
        Rien à configurer, rien à retenir.{' '}
        <Link href="/offre" className="font-medium text-[color:var(--color-brand)]">
          Voir l’accès à vie
          {config.price.current > 0
            ? ` — ${new Intl.NumberFormat('fr-FR').format(config.price.current)} ${config.price.currency}`
            : ''}
        </Link>
      </p>

      <LegalFooter className="mt-auto pt-6" />
    </main>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 18h6m-5 3h4M12 3a6 6 0 0 1 3.6 10.8c-.6.5-.9 1.1-.9 1.8v.4H9.3v-.4c0-.7-.3-1.3-.9-1.8A6 6 0 0 1 12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 15V5a2 2 0 0 1 2-2h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
