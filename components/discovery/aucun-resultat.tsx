'use client';

import { useRouter } from 'next/navigation';

/**
 * Ecran de recherche sans resultat.
 *
 * Trois choses, dans cet ordre : ce qui n'a pas marche, quoi essayer, et un
 * bouton qui remet tout a zero. Un ecran vide sans sortie fait quitter
 * l'application, et sur un telephone la sortie doit etre un bouton, pas une
 * manipulation de l'URL.
 */
export function AucunResultat({ terme, mode }: { terme?: string; mode: string }) {
  const router = useRouter();

  return (
    <div className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-5 py-8 text-center">
      <p className="text-[length:var(--texte-section)] font-semibold text-[color:var(--color-night)]">
        Aucune commande trouvée
      </p>

      <p className="mx-auto mt-2 max-w-[38ch] text-[length:var(--texte-corps)] leading-relaxed text-[color:var(--color-muted)]">
        {terme ? (
          <>
            Rien ne correspond à «&nbsp;{terme}&nbsp;». Essayez ce que vous voulez obtenir plutôt
            que le nom de la commande&nbsp;: «&nbsp;portrait&nbsp;», «&nbsp;facture&nbsp;»,
            «&nbsp;fond blanc&nbsp;».
          </>
        ) : (
          <>Aucune commande ne correspond à ces filtres. Essayez d’en retirer un.</>
        )}
      </p>

      <button
        type="button"
        onClick={() => router.replace(`/app?mode=${mode}`, { scroll: false })}
        className="touch-target mt-5 inline-flex items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-5 text-[length:var(--texte-corps)] font-semibold text-white"
      >
        Réinitialiser la recherche et les filtres
      </button>
    </div>
  );
}
