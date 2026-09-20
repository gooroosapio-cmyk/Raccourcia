'use client';

import { useActionState, useState } from 'react';

import { enregistrerChamp, supprimerChamp, type AdminActionState } from '@/lib/actions/admin';
import { AdminField, AdminFeedback, AdminSubmit, AdminTextarea } from '@/components/ui/admin-form';
import { ecrireLesChoix } from '@/lib/admin/choix';
import type { AdminChamp } from '@/lib/admin/queries';

/**
 * Les champs a remplir avant de copier.
 *
 * Trois au plus, et la base le fait respecter. Ce n'est pas une limite
 * technique : au-dela de trois, remplir devient plus long que reformuler
 * soi-meme, et la fiche cesse d'etre une fiche pour devenir un questionnaire.
 * Le nombre de questions que l'IA pose ensuite, lui, se regle ailleurs.
 *
 * La clef est ce qui entre dans le texte : ecrire {{secteur}} dans le prompt
 * complet fait poser la valeur a cet endroit-la. Sans marque, la valeur est
 * ajoutee en fin de texte, dans un bloc annonce comme des donnees.
 */

const GENRES = [
  { valeur: 'texte', libelle: 'Texte court' },
  { valeur: 'texte_long', libelle: 'Texte long' },
  { valeur: 'nombre', libelle: 'Nombre' },
  { valeur: 'liste', libelle: 'Liste de choix' },
] as const;

export function PromptChampsForm({ promptId, champs }: { promptId: string; champs: AdminChamp[] }) {
  const occupees = new Set(champs.map((champ) => champ.position));
  const libre = [1, 2, 3].find((position) => !occupees.has(position));

  return (
    <div className="space-y-3">
      {champs.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          Aucun champ. La commande se copie telle quelle.
        </p>
      ) : (
        <ul className="space-y-2">
          {champs.map((champ) => (
            <ChampRow key={champ.id} promptId={promptId} champ={champ} />
          ))}
        </ul>
      )}

      {libre ? (
        <details className="rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] p-3">
          <summary className="touch-target flex cursor-pointer items-center text-[13px] font-medium text-[color:var(--color-brand)]">
            Ajouter un champ ({champs.length}/3)
          </summary>
          <div className="mt-3">
            <ChampFields promptId={promptId} position={libre} />
          </div>
        </details>
      ) : (
        <p className="text-[12px] leading-relaxed text-[color:var(--color-muted)]">
          Trois champs au maximum. Retirez-en un pour en ajouter un autre.
        </p>
      )}
    </div>
  );
}

function ChampRow({ promptId, champ }: { promptId: string; champ: AdminChamp }) {
  const [state, action] = useActionState<AdminActionState, FormData>(supprimerChamp, {});
  const genre = GENRES.find((entree) => entree.valeur === champ.kind)?.libelle ?? champ.kind;

  return (
    <li className="rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-[color:var(--color-night)]">
            {champ.position}. {champ.libelle}
          </p>
          <p className="truncate text-[12px] text-[color:var(--color-muted)]">
            <code>{`{{${champ.cle}}}`}</code> · {genre}
            {champ.requis ? ' · obligatoire' : ''}
            {champ.choix.length > 0 ? ` · ${champ.choix.length} choix` : ''}
          </p>
        </div>
      </div>

      <details className="mt-3 border-t border-[color:var(--color-line)] pt-3">
        <summary className="touch-target flex cursor-pointer items-center text-[13px] font-medium text-[color:var(--color-brand)]">
          Modifier
        </summary>
        <div className="mt-3">
          <ChampFields promptId={promptId} position={champ.position} champ={champ} />
        </div>

        <form action={action} className="mt-3 border-t border-[color:var(--color-line)] pt-3">
          <input type="hidden" name="fieldId" value={champ.id} />
          <input type="hidden" name="promptId" value={promptId} />
          <button
            type="submit"
            className="touch-target flex w-full items-center justify-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] text-[13px] font-medium text-[color:var(--color-muted)]"
          >
            Retirer ce champ
          </button>
          <AdminFeedback state={state} />
        </form>
      </details>
    </li>
  );
}

function ChampFields({
  promptId,
  position,
  champ,
}: {
  promptId: string;
  position: number;
  champ?: AdminChamp;
}) {
  const [state, action] = useActionState<AdminActionState, FormData>(enregistrerChamp, {});
  const [genre, setGenre] = useState(champ?.kind ?? 'texte');

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="promptId" value={promptId} />
      <input type="hidden" name="position" value={position} />
      {champ ? <input type="hidden" name="id" value={champ.id} /> : null}

      <AdminField label="Libellé" name="libelle" defaultValue={champ?.libelle ?? ''} />
      <AdminField
        label="Clé"
        name="cle"
        defaultValue={champ?.cle ?? ''}
        hint="Écrivez {{la_clé}} dans le prompt complet pour placer la valeur. Sans marque, elle est ajoutée à la fin."
      />
      <AdminField
        label="Indication"
        name="indication"
        defaultValue={champ?.indication ?? ''}
        hint="Une ligne pour dire ce qu’on attend."
      />

      <label className="block">
        <span className="text-[13px] font-medium text-[color:var(--color-night)]">Type</span>
        <select
          name="kind"
          value={genre}
          onChange={(evenement) => setGenre(evenement.target.value as AdminChamp['kind'])}
          className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px]"
        >
          {GENRES.map((entree) => (
            <option key={entree.valeur} value={entree.valeur}>
              {entree.libelle}
            </option>
          ))}
        </select>
      </label>

      {/* Les choix ne concernent que la liste. Le champ reste rendu quand on
          change de type et revient : ce qui a ete saisi n'est pas perdu au
          passage. */}
      <div className={genre === 'liste' ? '' : 'hidden'}>
        <AdminTextarea
          label="Choix"
          name="choix"
          rows={4}
          defaultValue={ecrireLesChoix(champ?.choix ?? [])}
          hint="Une ligne par choix. « valeur | Libellé » pour distinguer les deux ; le libellé seul suffit."
        />
      </div>

      <label className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          name="requis"
          defaultChecked={champ?.requis ?? false}
          className="h-5 w-5 rounded border-[color:var(--color-line)]"
        />
        <span className="text-[13px] text-[color:var(--color-night)]">
          Obligatoire : la copie est refusée tant qu’il est vide
        </span>
      </label>

      <AdminFeedback state={state} />
      <AdminSubmit>{champ ? 'Enregistrer le champ' : 'Ajouter le champ'}</AdminSubmit>
    </form>
  );
}
