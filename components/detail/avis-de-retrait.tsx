import Link from 'next/link';
import type { CommandeRetiree } from '@/lib/catalog/types';

const BIBLIOTHEQUES: Record<string, string> = {
  images: 'Visuels',
  textes: 'Rédaction',
  reflexions: 'Assistants',
};

/**
 * Ce que voit quelqu'un dont le lien pointe vers une commande retiree.
 *
 * Le besoin n'est pas de le rattraper a tout prix. Il est de lui dire ce
 * qui s'est passe : il n'a pas fait d'erreur, la commande a existe, elle
 * n'est plus au catalogue. Une page « introuvable » laisse croire au
 * contraire — faute de frappe, lien casse, service en panne — et c'est ce
 * doute-la qu'on enleve.
 *
 * On ne propose une suite que lorsqu'une carte encore publiee porte LA MEME
 * commande. Envoyer vers une commande voisine serait une redirection
 * deguisee : elle promettrait un resultat qui ne viendrait pas, et la
 * personne mettrait l'echec sur le compte de l'outil.
 */
export function AvisDeRetrait({ commande }: { commande: CommandeRetiree }) {
  const bibliotheque = commande.bibliotheque ? BIBLIOTHEQUES[commande.bibliotheque] : null;
  const date = commande.retireeLe
    ? new Date(commande.retireeLe).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <article className="pt-6">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
        Commande retirée
      </p>

      <h1 className="mt-2 text-[26px] font-semibold leading-tight text-[color:var(--color-night)]">
        {commande.nom}
      </h1>
      <p className="commande text-[length:var(--texte-corps)] font-semibold text-[color:var(--color-muted)]">
        {commande.commande}
      </p>

      <p className="mt-4 text-[17px] leading-relaxed text-[color:var(--color-night)]">
        Cette commande ne fait plus partie du catalogue
        {date ? <> depuis {date}</> : null}. Votre lien est bon : c’est le catalogue qui a changé.
      </p>

      {commande.remplacante ? (
        <section className="mt-6 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
          <p className="text-[15px] leading-relaxed text-[color:var(--color-night)]">
            La commande <span className="commande font-semibold">{commande.commande}</span> existe
            toujours, sous une autre carte.
          </p>
          <Link
            href={`/r/${commande.remplacante.slug}`}
            className="mt-3 flex h-13 items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-4 text-center text-[15px] font-semibold text-white"
          >
            Ouvrir {commande.remplacante.nom}
          </Link>
        </section>
      ) : (
        <section className="mt-6 rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
          <p className="text-[15px] leading-relaxed text-[color:var(--color-night)]">
            Aucune commande ne la remplace à l’identique.
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
            Plutôt que de vous envoyer vers une commande approchante, qui ne donnerait pas le même
            résultat, la bibliothèque vous laisse chercher ce dont vous avez besoin.
          </p>
          <Link
            href={bibliotheque ? `/app?q=${encodeURIComponent(commande.commande)}` : '/app'}
            className="mt-3 flex h-13 items-center justify-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-4 text-center text-[15px] font-semibold text-white"
          >
            Chercher dans la bibliothèque
          </Link>
        </section>
      )}

      {bibliotheque ? (
        <p className="mt-6 text-[13px] text-[color:var(--color-muted)]">
          Elle appartenait à {bibliotheque}.
        </p>
      ) : null}
    </article>
  );
}
