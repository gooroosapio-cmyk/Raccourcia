'use client';

import { useActionState } from 'react';

import { updatePromptIdentity, type AdminActionState } from '@/lib/actions/admin';
import {
  AdminCheckboxGroup,
  AdminField,
  AdminFeedback,
  AdminSubmit,
  AdminTextarea,
  AdminToggle,
} from '@/components/ui/admin-form';
import {
  ENTITY_TYPES,
  ENTITY_TYPE_LABELS,
  INPUT_EXAMPLE_KINDS,
  INPUT_EXAMPLE_LABELS,
  LIBRARIES,
  LIBRARY_LABELS,
  MODES,
  MODE_LABELS,
  OUTPUT_FORMAT_KINDS,
  OUTPUT_FORMAT_LABELS,
} from '@/lib/constants';
import type { AdminCategory, AdminPromptDetail } from '@/lib/admin/queries';

/**
 * Bloc Identite du formulaire.
 *
 * `show_image_card` est ici une decision editoriale explicite : les prompts
 * texte n'affichent aucune carte image imposee, c'est une regle produit.
 */
export function PromptIdentityForm({
  prompt,
  categories,
}: {
  prompt: AdminPromptDetail;
  categories: AdminCategory[];
}) {
  const [state, action] = useActionState<AdminActionState, FormData>(updatePromptIdentity, {});

  // Les sous-categories sont indentees pour rendre la hierarchie lisible.
  const options = categories
    .filter((category) => category.parentId === null)
    .flatMap((parent) => [
      { id: parent.id, label: `${MODE_LABELS[parent.mode]} - ${parent.name}` },
      ...categories
        .filter((child) => child.parentId === parent.id)
        .map((child) => ({
          id: child.id,
          label: `${MODE_LABELS[parent.mode]} - ${parent.name} > ${child.name}`,
        })),
    ]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="promptId" value={prompt.id} />

      {/* L'alias technique et le titre public sont deux choses : le premier
          se tape dans une IA et ne bouge plus une fois partage, le second se
          lit dans la galerie et se reecrit quand il ne nomme pas le
          resultat. Les confondre obligerait a casser des liens pour
          corriger un mot. */}
      <AdminField
        label="Alias technique"
        name="command"
        defaultValue={prompt.command}
        hint="Ce qui se tape et se partage. Le changer casse les liens déjà diffusés."
      />
      <AdminField
        label="Titre public"
        name="name"
        defaultValue={prompt.name}
        hint="Deux à cinq mots qui nomment le résultat. Se réécrit librement."
      />
      <AdminTextarea
        label="Description courte"
        name="shortDescription"
        defaultValue={prompt.shortDescription}
        rows={2}
        hint="Une phrase orientee résultat, visible sur la carte."
      />

      {/* Le genre decide du verbe des boutons et du repere de la carte : on
          active un mode, on commence un parcours, on utilise un prompt. */}
      <label className="block">
        <span className="text-[13px] font-medium text-[color:var(--color-night)]">
          Type de contenu
        </span>
        <select
          name="entityType"
          defaultValue={prompt.entityType ?? ''}
          className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px]"
        >
          <option value="">Non précisé</option>
          {ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {ENTITY_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-[13px] font-medium text-[color:var(--color-night)]">Mode</span>
        <select
          name="mode"
          defaultValue={prompt.mode}
          className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px]"
        >
          {MODES.map((mode) => (
            <option key={mode} value={mode}>
              {MODE_LABELS[mode]}
            </option>
          ))}
        </select>
      </label>

      {/* La bibliotheque ne se deduit pas du mode : les quatre-vingt-deux
          commandes « texte » d'aujourd'hui sont toutes des Modes IA, donc
          des Reflexions, mais un /businessplan sera « texte » sans en etre
          un. Un declencheur en pose une par defaut ; c'est ici qu'on la
          corrige, et elle n'est jamais remise a vide. */}
      <label className="block">
        <span className="text-[13px] font-medium text-[color:var(--color-night)]">
          Bibliothèque
        </span>
        <select
          name="library"
          defaultValue={prompt.library ?? ''}
          className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px]"
        >
          <option value="">Laisser la valeur par défaut</option>
          {LIBRARIES.map((library) => (
            <option key={library} value={library}>
              {LIBRARY_LABELS[library]}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[12px] text-[color:var(--color-muted)]">
          C’est le premier filtre de l’accueil.
        </span>
      </label>

      <label className="block">
        <span className="text-[13px] font-medium text-[color:var(--color-night)]">Catégorie</span>
        <select
          name="categoryId"
          defaultValue={prompt.categoryId ?? ''}
          className="mt-1 h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-[15px]"
        >
          <option value="">Aucune catégorie</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[12px] text-[color:var(--color-muted)]">
          Une catégorie est obligatoire pour publier.
        </span>
      </label>

      <AdminTextarea
        label="Promesse de résultat"
        name="resultSummary"
        defaultValue={prompt.resultSummary ?? ''}
        rows={2}
        hint="Ce que le membre obtient, en une phrase. A defaut, la description courte est reprise."
      />

      <AdminCheckboxGroup
        legend="Exemples d entrees"
        name="inputExamples"
        options={INPUT_EXAMPLE_KINDS.map((kind) => ({
          value: kind,
          label: INPUT_EXAMPLE_LABELS[kind],
        }))}
        selected={prompt.inputExamples}
        hint="Ce que la commande sait reellement traiter. 4 maximum, affichés en tuiles sur la fiche."
      />

      <AdminCheckboxGroup
        legend="Formats de sortie"
        name="outputFormats"
        options={OUTPUT_FORMAT_KINDS.map((kind) => ({
          value: kind,
          label: OUTPUT_FORMAT_LABELS[kind],
        }))}
        selected={prompt.outputFormats}
        hint="Ce que la commande produit vraiment. Ne pas tout cocher par defaut."
      />

      <AdminTextarea
        label="Cas d’usage"
        name="useCases"
        defaultValue={prompt.useCases.join('\n')}
        rows={3}
        hint="Un par ligne, 3 maximum affichés. Surtout utile pour les prompts écrits."
      />
      <AdminTextarea
        label="Tags"
        name="tags"
        defaultValue={prompt.tags.join('; ')}
        rows={2}
        hint="Separes par un point-virgule."
      />
      {/* Ce qu'on tape quand on ne connait pas le titre : ancien nom,
          orthographe approchante, mot du langage courant. La recherche les
          lit depuis la refonte — avant, ils etaient ecrits et ignores. */}
      <AdminTextarea
        label="Synonymes de recherche"
        name="searchKeywords"
        defaultValue={prompt.searchKeywords.join('; ')}
        rows={2}
        hint="Séparés par un point-virgule. Anciens noms, variantes d’orthographe, mots courants."
      />
      {/* Le personnage ou l'univers vise, quand la commande en vise un.
          Il rend la commande trouvable par ce nom ; il ne revendique aucun
          partenariat, et le texte de la commande ne doit pas en suggerer un. */}
      <AdminField
        label="Personnage ou univers"
        name="univers"
        defaultValue={prompt.univers ?? ''}
        hint="Laisser vide si la commande ne vise personne en particulier."
      />
      <AdminTextarea
        label="Conseil d’utilisation"
        name="expectedInput"
        defaultValue={prompt.expectedInput ?? ''}
        rows={2}
        hint='Exemple : "Ajoutez votre image avec le prompt."'
      />
      <AdminTextarea
        label="Limites"
        name="limitations"
        defaultValue={prompt.limitations ?? ''}
        rows={2}
        hint="Affichees dans la fiche pour les commandes sensibles."
      />
      <AdminTextarea
        label="Notes internes"
        name="adminNotes"
        defaultValue={prompt.adminNotes ?? ''}
        rows={2}
        hint="Jamais visibles par les membres."
      />
      <AdminTextarea
        label="Intention"
        name="intention"
        defaultValue={prompt.intention ?? ''}
        rows={2}
      />

      <div className="space-y-2 rounded-[color:var(--radius-control)] bg-[color:var(--color-canvas)] p-3">
        <AdminToggle
          label="Carte avec visuel"
          name="showImageCard"
          defaultChecked={prompt.showImageCard}
          hint="A laisser désactivé pour les prompts texte."
        />
        <AdminToggle
          label="Gratuit"
          name="isFree"
          defaultChecked={prompt.isFree}
          hint="Copiable sans achat, sert de démonstration."
        />
        <AdminToggle label="Mis en avant" name="isFeatured" defaultChecked={prompt.isFeatured} />
        <AdminToggle label="Nouveau" name="isNew" defaultChecked={prompt.isNew} />
      </div>

      <AdminFeedback state={state} />
      <AdminSubmit>Enregistrer l’identité</AdminSubmit>
    </form>
  );
}
