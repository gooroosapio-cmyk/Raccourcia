import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { LegalFooter } from '@/components/navigation/legal-footer';
import { getCatalogCounts, getPublicConfig } from '@/lib/catalog/queries';

/**
 * Accueil public. Il montre la valeur avant le verrou : le contenu complet
 * d'une commande n'apparait jamais ici (Spec UX/UI V1, section 10).
 *
 * La page reste courte. Un visiteur qui arrive sur RaccourcIA veut voir des
 * commandes, pas lire une brochure : trois benefices, un exemple, et l'entree
 * dans la bibliotheque.
 */
export default async function LandingPage() {
  const [counts, config] = await Promise.all([getCatalogCounts(), getPublicConfig()]);

  const benefices = [
    {
      titre: 'Trouver',
      corps: 'Des commandes pretes a l emploi, classees par cas d usage.',
      icone: <SearchIcon />,
    },
    {
      titre: 'Visualiser',
      corps: 'Des exemples avant / apres pour savoir ce que vous obtenez.',
      icone: <ImageIcon />,
    },
    {
      titre: 'Copier',
      corps: 'Une seule commande a copier, puis a coller dans votre IA.',
      icone: <CopyIcon />,
    },
  ];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col px-5 pb-10 pt-4 lg:max-w-4xl">
      <header className="flex items-center justify-between">
        <Logo className="text-xl" />
        <Link
          href="/connexion"
          className="touch-target inline-flex items-center rounded-[color:var(--radius-control)] px-3 text-[15px] font-medium text-[color:var(--color-night)]"
        >
          Se connecter
        </Link>
      </header>

      <section className="relative mt-8">
        {/* Unique decoration de marque : un halo bleu tres pale. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-[color:var(--color-brand)]/10 blur-3xl"
        />

        <p className="relative text-[14px] font-semibold text-[color:var(--color-brand)]">
          Acces a vie, paiement unique
        </p>
        <h1 className="relative mt-2 text-[38px] font-semibold leading-[1.1] tracking-tight text-[color:var(--color-night)]">
          Le bon prompt,
          <br />
          en un geste.
        </h1>
        <p className="relative mt-3 max-w-[42ch] text-[16px] leading-relaxed text-[color:var(--color-muted)]">
          Choisissez une commande, utilisez-la dans ChatGPT, Claude ou Gemini et obtenez un meilleur
          resultat. Rien a configurer, rien a retenir.
        </p>

        <Link
          href="/app"
          className="relative mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] text-[16px] font-semibold text-white transition-[background-color,transform] duration-[var(--duration-fast)] hover:bg-[color:var(--color-brand-strong)] active:scale-[0.99] sm:w-auto sm:px-8"
        >
          Decouvrir les commandes
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

        {counts.free > 0 ? (
          <p className="relative mt-3 text-[13px] text-[color:var(--color-muted)]">
            {counts.free} commandes copiables sans compte payant, sur {counts.total} au catalogue.
          </p>
        ) : null}
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-3">
        {benefices.map((benefice) => (
          <article
            key={benefice.titre}
            className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-card)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-sky)] text-[color:var(--color-brand)]">
              {benefice.icone}
            </span>
            <h2 className="mt-3 text-[17px] font-semibold text-[color:var(--color-night)]">
              {benefice.titre}
            </h2>
            <p className="mt-1 text-[14px] leading-relaxed text-[color:var(--color-muted)]">
              {benefice.corps}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-8 overflow-hidden rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
        <h2 className="text-[17px] font-semibold text-[color:var(--color-night)]">
          Un meilleur rendu, en un geste
        </h2>
        <p className="mt-1 text-[14px] leading-relaxed text-[color:var(--color-muted)]">
          Chaque commande image montre son point de depart et son resultat, cote a cote. Vous savez
          ce que vous obtenez avant de copier.
        </p>
        <Link
          href="/offre"
          className="mt-4 inline-flex h-12 items-center text-[15px] font-semibold text-[color:var(--color-brand)] underline underline-offset-2"
        >
          Voir l acces a vie
          {config.price.current > 0 ? (
            <span className="ml-1.5 font-normal text-[color:var(--color-muted)]">
              {new Intl.NumberFormat('fr-FR').format(config.price.current)} {config.price.currency}
            </span>
          ) : null}
        </Link>
      </section>

      <LegalFooter className="mt-auto pt-10" />
    </main>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
