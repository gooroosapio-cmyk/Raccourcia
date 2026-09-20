'use client';

import { useRouter } from 'next/navigation';

/**
 * Ecran de recherche sans resultat.
 *
 * Trois choses, dans cet ordre : ce qui n'a pas marche, quoi essayer, et un
 * bouton qui remet tout a zero. Un ecran vide sans sortie fait quitter
 * l'application, et sur un telephone la sortie doit etre un bouton, pas une
 * manipulation de l'URL.
 *
 * Les exemples proposes tiennent en un mot : la recherche compare une seule
 * chaine au champ concatene du raccourci, donc deux mots ne se trouvent que
 * s'ils s'y suivent. Conseiller « fond blanc » serait conseiller un echec.
 */
export function AucunResultat({
  terme,
  bibliotheque,
  famille = null,
}: {
  terme?: string;
  /**
   * La bibliotheque en cours, quand il y en a une.
   *
   * « Elargir » la garde et abandonne le rayon : on cherchait dans les
   * Images, on continue d'y chercher. C'est le filtre le plus large, et
   * celui qu'on a le moins de chances d'avoir pose par erreur.
   */
  bibliotheque?: string;
  /**
   * Le nom de la famille choisie, quand il y en a une.
   *
   * Un rayon choisi borne la recherche : ce qu'on cherche existe peut-etre
   * dans le rayon d'a cote. Le dire, et proposer le geste, vaut mieux que de
   * laisser croire que la commande n'existe pas.
   */
  famille?: string | null;
}) {
  const router = useRouter();
  const elargir = Boolean(terme && famille);

  return (
    <div className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-5 py-8 text-center">
      <p className="text-[length:var(--texte-section)] font-semibold text-[color:var(--color-night)]">
        Aucune commande trouvée
      </p>

      <p className="mx-auto mt-2 max-w-[38ch] text-[length:var(--texte-corps)] leading-relaxed text-[color:var(--color-muted)]">
        {elargir ? (
          <>
            Rien ne correspond à «&nbsp;{terme}&nbsp;» dans {famille}. La commande existe peut-être
            dans un autre rayon.
          </>
        ) : terme ? (
          <>
            Rien ne correspond à «&nbsp;{terme}&nbsp;». Essayez un seul mot, celui de ce que vous
            voulez obtenir plutôt que le nom de la commande&nbsp;: «&nbsp;portrait&nbsp;»,
            «&nbsp;facture&nbsp;», «&nbsp;packaging&nbsp;».
          </>
        ) : (
          <>Aucune commande ne correspond à ces filtres. Essayez d’en retirer un.</>
        )}
      </p>

      {/* Elargir d'abord, reinitialiser ensuite : le premier garde ce qu'on
          cherchait, le second l'abandonne. */}
      {elargir ? (
        <button
          type="button"
          onClick={() => {
            const suivants = new URLSearchParams();
            if (bibliotheque) suivants.set('bibliotheque', bibliotheque);
            suivants.set('q', terme!);
            router.replace(`/app?${suivants.toString()}`, { scroll: false });
          }}
          className="touch-target mt-5 inline-flex w-full items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-5 text-[length:var(--texte-corps)] font-semibold text-white"
        >
          Chercher dans tous les rayons
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => router.replace('/app', { scroll: false })}
        className={`touch-target mt-3 inline-flex items-center justify-center rounded-[color:var(--radius-control)] px-5 text-[length:var(--texte-corps)] font-semibold ${
          elargir
            ? 'text-[color:var(--color-brand)]'
            : 'mt-5 bg-[color:var(--color-brand)] text-white'
        }`}
      >
        Réinitialiser les filtres
      </button>
    </div>
  );
}
