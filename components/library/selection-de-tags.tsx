import Link from 'next/link';
import { TAG_GROUP_LABELS } from '@/lib/constants';
import type { TagExplorable, TagVoisin } from '@/lib/catalog/tags';

/**
 * La selection de tags en cours, et ce qu'on peut y ajouter.
 *
 * Tout passe par des liens, donc par le serveur : la page est partageable,
 * le retour arriere fonctionne, et rien de tout cela ne demande de
 * JavaScript. C'est une navigation, pas un reglage — la traiter comme un
 * formulaire aurait coute un composant client pour reconstruire des adresses
 * que le serveur sait deja ecrire.
 *
 * Les tags proposes viennent du croisement, pas du catalogue entier :
 * proposer « Portrait (484) » a cote de « Vintage » quand les deux ensemble
 * n'en rendent que six serait annoncer une piste qui est une impasse.
 */
export function SelectionDeTags({
  principal,
  ajoutes,
  voisins,
  lien,
}: {
  /** Le tag qui porte la page. Il ne se retire pas : il la definit. */
  principal: TagExplorable;
  /** Les tags croises par-dessus, chacun retirable. */
  ajoutes: TagVoisin[];
  /** Ce qu'on peut encore croiser, compte sur le croisement. */
  voisins: TagVoisin[];
  /** Fabrique l'adresse d'une selection donnee. */
  lien: (slugs: string[]) => string;
}) {
  const slugsAjoutes = ajoutes.map((tag) => tag.slug);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex touch-target items-center rounded-full bg-[color:var(--color-brand)] px-3.5 text-[length:var(--texte-carte)] font-semibold text-white">
          {principal.nom}
        </span>

        {ajoutes.map((tag) => (
          <Link
            key={tag.slug}
            href={lien(slugsAjoutes.filter((slug) => slug !== tag.slug))}
            scroll={false}
            aria-label={`Retirer le tag ${tag.nom}`}
            className="touch-target inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-brand-soft)] pl-3.5 pr-2 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-brand-strong)]"
          >
            {tag.nom}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        ))}

        {ajoutes.length > 0 ? (
          <Link
            href={lien([])}
            scroll={false}
            className="touch-target inline-flex items-center px-2 text-[13px] font-medium text-[color:var(--color-muted)] underline underline-offset-2"
          >
            Tout retirer
          </Link>
        ) : null}
      </div>

      {voisins.length > 0 ? (
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
            Resserrer
          </h2>
          {/* Un rail : ces propositions sont secondaires, et douze puces
              repliees sur trois lignes repousseraient les commandes — ce
              qu'on est venu voir — sous la ligne de flottaison. */}
          <div className="rail -mx-5 mt-2 px-5">
            <div className="flex w-max gap-2 pb-1">
              {voisins.map((tag) => (
                <Link
                  key={tag.slug}
                  href={lien([...slugsAjoutes, tag.slug])}
                  scroll={false}
                  title={TAG_GROUP_LABELS[tag.groupe]}
                  className="touch-target inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[color:var(--color-sky)] px-3.5 text-[length:var(--texte-carte)] font-medium text-[color:var(--color-night)]"
                >
                  {tag.nom}
                  <span className="text-[color:var(--color-muted)]">{tag.total}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
