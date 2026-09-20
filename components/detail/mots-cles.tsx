'use client';

import Link from 'next/link';
import { useState } from 'react';

/**
 * Les tags d'une fiche, et ce qu'ils ouvrent.
 *
 * Ce ne sont pas des etiquettes decoratives : chacun mene a la Bibliotheque,
 * filtree sur lui. C'est la sortie naturelle d'une fiche qui ne convient
 * pas tout a fait — « pas celle-la, mais quelque chose de ce genre » — et
 * elle n'existait nulle part : il fallait fermer, remonter, et recommencer
 * une recherche.
 *
 * TROIS VISIBLES, LE RESTE DERRIERE UN « +N ». Une commande en porte
 * jusqu'a six, et six pastilles font deux rangees sous une fiche deja
 * dense. Au-dela de trois, on ne les lit plus : on voit un bloc gris. Le
 * « +N » ne cache rien — il dit combien il en reste, et un geste les
 * ouvre.
 *
 * Aucun nom d'IA ici. ChatGPT, Claude et Gemini ne sont pas des sujets
 * mais des compatibilites, et elles ont leur propre zone en bas de fiche :
 * les melanger aux tags laisserait croire qu'on peut filtrer le catalogue
 * par moteur depuis ici. La requete les ecarte deja ; ce composant n'a donc
 * rien a trier.
 */
const VISIBLES = 3;

export function MotsCles({ mots }: { mots: { slug: string; nom: string }[] }) {
  const [tout, setTout] = useState(false);

  if (mots.length === 0) return null;

  const montres = tout ? mots : mots.slice(0, VISIBLES);
  const restants = mots.length - montres.length;

  return (
    <section className="mt-5">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
        Dans le même esprit
      </h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {montres.map((mot) => (
          <li key={mot.slug}>
            <Link
              href={`/app/bibliotheque/tag/${mot.slug}`}
              className="touch-target inline-flex items-center rounded-full bg-[color:var(--color-sky)] px-3.5 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-night)]"
            >
              {mot.nom}
            </Link>
          </li>
        ))}

        {restants > 0 ? (
          <li>
            <button
              type="button"
              onClick={() => setTout(true)}
              className="touch-target inline-flex items-center rounded-full border border-[color:var(--color-line)] px-3.5 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-muted)]"
            >
              +{restants}
            </button>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
