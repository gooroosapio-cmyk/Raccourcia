import Link from 'next/link';

/** Jamais d'ecran mort : on propose toujours une sortie (Spec UX/UI, 3.3). */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col justify-center px-5">
      <h1 className="text-2xl font-semibold text-[color:var(--color-night)]">Page introuvable</h1>
      <p className="mt-2 text-[15px] text-[color:var(--color-muted)]">
        Ce raccourci n existe pas ou n est plus disponible.
      </p>
      <Link
        href="/"
        className="mt-6 flex h-12 w-full items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] font-medium text-white"
      >
        Revenir a l accueil
      </Link>
    </main>
  );
}
