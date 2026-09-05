import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

/**
 * Landing publique. Elle montre la valeur avant le verrou : le prompt complet
 * n'apparait jamais ici (Spec UX/UI V1, section 10).
 */
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col px-5 pb-12 pt-6">
      <header className="flex items-center justify-between">
        <Logo className="text-xl" />
        <Link
          href="/connexion"
          className="touch-target inline-flex items-center rounded-[color:var(--radius-control)] px-3 text-sm font-medium text-[color:var(--color-night)]"
        >
          Se connecter
        </Link>
      </header>

      <section className="mt-10">
        <p className="text-sm font-medium text-[color:var(--color-brand)]">
          Acces a vie, paiement unique
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-[color:var(--color-night)]">
          Le bon prompt, en un geste.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--color-muted)]">
          Choisissez un raccourci, copiez le prompt complet, collez-le dans ChatGPT, Claude ou
          Gemini. Rien a configurer, rien a retenir.
        </p>

        <Link
          href="/connexion"
          className="mt-6 flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] text-base font-medium text-white transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--color-brand-strong)]"
        >
          Debloquer RaccourcIA
        </Link>
      </section>

      <section className="mt-10 grid gap-3">
        {[
          {
            title: 'Trouver',
            body: 'Deux modes, Image et Texte, puis des categories courtes pour reduire le choix.',
          },
          {
            title: 'Comprendre',
            body: 'Un visuel, une phrase de resultat et des cas d usage courts. Pas de documentation.',
          },
          {
            title: 'Copier',
            body: 'La commande copie le prompt complet, adapte a l IA que vous utilisez.',
          },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4"
          >
            <h2 className="text-base font-semibold text-[color:var(--color-night)]">
              {item.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[color:var(--color-muted)]">
              {item.body}
            </p>
          </article>
        ))}
      </section>

      <footer className="mt-auto pt-10 text-xs text-[color:var(--color-muted)]">
        RaccourcIA - bibliotheque de raccourcis pour ChatGPT, Claude et Gemini.
      </footer>
    </main>
  );
}
