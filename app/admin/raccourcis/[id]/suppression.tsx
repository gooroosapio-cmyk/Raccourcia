'use client';

import { useActionState, useState } from 'react';

import { supprimerCommande, type AdminActionState } from '@/lib/actions/admin';
import { AdminFeedback } from '@/components/ui/admin-form';

/**
 * Supprimer une commande, definitivement.
 *
 * Archiver reste le geste par defaut, et il est juste au-dessus : il
 * conserve la ligne, ses relations et son identifiant, et se defait d'un
 * clic. Celui-ci ne se defait pas.
 *
 * Il demande donc de retaper la commande. Une case a cocher se coche sans
 * lire ; retaper « /goldenselfie » oblige a regarder ce qu'on detruit, et
 * c'est la seule barriere qui distingue un geste voulu d'un geste rapide.
 * Le serveur reverifie la saisie contre ce que la base porte, pas contre un
 * champ cache — celui-ci se modifie dans le navigateur.
 *
 * Le bilan est annonce avant, pas apres : visuels, variantes, versions,
 * favoris, tags, champs. C'est la difference entre confirmer et
 * accepter.
 */
export function SuppressionDeCommande({
  promptId,
  command,
  bilan,
}: {
  promptId: string;
  command: string;
  bilan: {
    visuels: number;
    variantes: number;
    versions: number;
    favoris: number;
    tags: number;
    champs: number;
    liensAnciens: number;
  };
}) {
  const [state, action] = useActionState<AdminActionState, FormData>(supprimerCommande, {});
  const [ouvert, setOuvert] = useState(false);

  const lignes = [
    [bilan.versions, 'version', 'versions du texte complet'],
    [bilan.visuels, 'visuel', 'visuels'],
    [bilan.variantes, 'variante', 'variantes par IA'],
    [bilan.favoris, 'favori', 'favoris de membres'],
    [bilan.tags, 'tag', 'tags posés'],
    [bilan.champs, 'champ', 'champs de personnalisation'],
  ] as const;

  const emportes = lignes.filter(([nombre]) => (nombre as number) > 0);

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="touch-target flex w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-danger)] text-[13px] font-medium text-[color:var(--color-danger)]"
      >
        Supprimer définitivement
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="promptId" value={promptId} />

      <div className="rounded-[color:var(--radius-control)] bg-[color:var(--color-danger-soft)] p-3">
        <p className="text-[13px] font-semibold text-[color:var(--color-danger)]">
          Cette suppression est définitive.
        </p>
        {emportes.length > 0 ? (
          <ul className="mt-2 space-y-0.5 text-[13px] leading-relaxed text-[color:var(--color-night)]">
            {emportes.map(([nombre, singulier, pluriel]) => (
              <li key={singulier}>
                {nombre} {nombre === 1 ? singulier : pluriel}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[13px] text-[color:var(--color-night)]">
            Rien d’autre n’est rattaché à cette commande.
          </p>
        )}
        <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--color-muted)]">
          Le journal d’administration garde la trace de ce qui a disparu.
        </p>
      </div>

      {bilan.liensAnciens > 0 ? (
        <label className="flex items-start gap-2 rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] p-3">
          <input
            type="checkbox"
            name="emporterLesLiens"
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-[color:var(--color-line)]"
          />
          <span className="text-[13px] leading-relaxed text-[color:var(--color-night)]">
            Emporter aussi {bilan.liensAnciens} ancien
            {bilan.liensAnciens > 1 ? 's' : ''} lien{bilan.liensAnciens > 1 ? 's' : ''} qui mène
            {bilan.liensAnciens > 1 ? 'nt' : ''} ici. Ils cesseront de fonctionner pour tous ceux
            qui les ont partagés.
          </span>
        </label>
      ) : null}

      <label className="block">
        <span className="text-[13px] font-medium text-[color:var(--color-night)]">
          Retapez <code className="font-mono">{command}</code> pour confirmer
        </span>
        <input
          name="confirmation"
          autoComplete="off"
          className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 font-mono text-[15px]"
        />
      </label>

      <AdminFeedback state={state} />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="touch-target flex items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] text-[13px] font-medium text-[color:var(--color-night)]"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="touch-target flex items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-danger)] text-[13px] font-semibold text-white"
        >
          Supprimer
        </button>
      </div>
    </form>
  );
}
