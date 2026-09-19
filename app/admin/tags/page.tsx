import { listAdminTags } from '@/lib/admin/tags';
import { TagCreateForm, TagRow } from '@/app/admin/tags/tag-forms';
import { TAG_GROUPS, TAG_GROUP_LABELS } from '@/lib/constants';

export const metadata = { title: 'Tags' };

/**
 * Les tags : ce qui range le catalogue autrement que par rayon.
 *
 * Un rayon donne une place et une seule ; un tag qualifie, et plusieurs se
 * croisent. C'est par eux que la Bibliotheque s'explore desormais, donc
 * c'est ici que le catalogue devient trouvable — ou ne l'est pas.
 *
 * Les tags sans commande sont montres, contrairement a la Bibliotheque qui
 * les cache : ce sont ceux qui attendent d'etre poses, et les cacher ici
 * reviendrait a cacher le travail qui reste.
 */
export default async function AdminTagsPage() {
  const tags = await listAdminTags();

  const poses = tags.filter((tag) => tag.publiees > 0).length;
  const vides = tags.filter((tag) => tag.total === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Tags</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          {tags.length} tag{tags.length > 1 ? 's' : ''}, dont {poses} porté
          {poses > 1 ? 's' : ''} par au moins une commande publiée. La Bibliothèque ne propose que
          ceux-là : un tag vide n’y apparaît pas.
        </p>
      </div>

      {vides.length > 0 ? (
        <p className="rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-sky)] p-3 text-[13px] leading-relaxed text-[color:var(--color-night)]">
          {vides.length} tag{vides.length > 1 ? 's' : ''} n’
          {vides.length > 1 ? 'ont' : 'a'} encore aucune commande. Posez-les depuis la fiche d’un
          raccourci, dans « Tags ».
        </p>
      ) : null}

      <details className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        <summary className="min-h-11 cursor-pointer list-none text-[13px] font-medium text-[color:var(--color-brand)]">
          Créer un tag
        </summary>
        <div className="mt-3">
          <TagCreateForm />
        </div>
      </details>

      {TAG_GROUPS.map((groupe) => {
        const duGroupe = tags.filter((tag) => tag.groupe === groupe);
        if (duGroupe.length === 0) return null;

        return (
          <section key={groupe} className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
              {TAG_GROUP_LABELS[groupe]} ({duGroupe.length})
            </h2>
            <ul className="space-y-2">
              {duGroupe.map((tag) => (
                <TagRow key={tag.id} tag={tag} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
