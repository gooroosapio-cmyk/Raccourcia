'use client';

import { useEffect, useRef, useState } from 'react';

type Etat =
  | { genre: 'ferme' }
  | { genre: 'chargement' }
  | { genre: 'pret'; texte: string }
  | { genre: 'erreur'; message: string };

/**
 * « Voir le prompt final » : le texte tel qu'il sera copie, replie.
 *
 * LA MEME SOURCE QUE LA COPIE. L'apercu interroge la route de lecture avec
 * les champs saisis, exactement comme le bouton « Copier le prompt » : ce
 * qui s'affiche ici est, au caractere pres, ce qui part dans le
 * presse-papiers. Une mise en forme calculee dans le navigateur aurait pu
 * diverger du texte du serveur sans que personne le voie.
 *
 * LIRE N'EST PAS COPIER. La route ne journalise rien : ouvrir l'apercu ne
 * compte pas une copie.
 *
 * JAMAIS SANS ACCES. La fiche ne le rend pas sur une commande verrouillee,
 * et la route refuse de toute facon : le texte d'une commande reservee
 * n'atteint pas un navigateur qui n'y a pas droit.
 *
 * Replie par defaut : la fiche se lit d'abord comme une promesse et des
 * champs a remplir. Ouvert, il suit la saisie avec un court delai, pour ne
 * pas interroger le serveur a chaque lettre.
 */
export function ApercuDuPrompt({
  promptId,
  champs,
}: {
  promptId: string;
  champs: { cle: string; valeur: string }[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, setEtat] = useState<Etat>({ genre: 'ferme' });
  // La saisie sous forme de cle stable : l'effet ne repart que si elle change.
  const signature = JSON.stringify(champs);
  const derniere = useRef(0);

  useEffect(() => {
    if (!ouvert) return;
    const numero = ++derniere.current;
    const minuterie = window.setTimeout(() => {
      setEtat((actuel) => (actuel.genre === 'pret' ? actuel : { genre: 'chargement' }));
      fetch('/api/resolve-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId, surface: 'detail', champs: JSON.parse(signature) }),
        cache: 'no-store',
      })
        .then(async (reponse) => {
          const data = (await reponse.json().catch(() => ({}))) as {
            payload?: string;
            error?: string;
          };
          // Une reponse arrivee apres une saisie plus recente est ignoree.
          if (numero !== derniere.current) return;
          if (!reponse.ok || !data.payload) {
            setEtat({ genre: 'erreur', message: data.error ?? 'Aperçu indisponible.' });
            return;
          }
          setEtat({ genre: 'pret', texte: data.payload });
        })
        .catch(() => {
          if (numero === derniere.current) {
            setEtat({ genre: 'erreur', message: 'Connexion interrompue. Réessayez.' });
          }
        });
    }, 350);
    return () => window.clearTimeout(minuterie);
  }, [ouvert, promptId, signature]);

  return (
    <section className="mt-4">
      <button
        type="button"
        onClick={() => setOuvert((valeur) => !valeur)}
        aria-expanded={ouvert}
        aria-controls="apercu-prompt"
        className="touch-target flex w-full items-center justify-between gap-2 rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-2.5 text-left text-[length:var(--texte-corps)] font-medium text-[color:var(--color-night)]"
      >
        Voir le prompt final
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={`shrink-0 text-[color:var(--color-muted)] transition-transform duration-[var(--duration-fast)] ${
            ouvert ? 'rotate-180' : ''
          }`}
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {ouvert ? (
        <div id="apercu-prompt" className="mt-2" aria-live="polite">
          {etat.genre === 'pret' ? (
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)] p-3 font-mono text-[13px] leading-relaxed text-[color:var(--color-night)]">
              {etat.texte}
            </pre>
          ) : etat.genre === 'erreur' ? (
            <p className="rounded-[color:var(--radius-control)] bg-[color:var(--color-danger-soft)] px-3 py-2.5 text-[length:var(--texte-meta)] text-[color:var(--color-danger)]">
              {etat.message}
            </p>
          ) : (
            <p className="px-1 py-2 text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
              Préparation de l’aperçu…
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
