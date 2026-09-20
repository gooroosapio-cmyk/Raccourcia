import Link from 'next/link';

import { listAdminPrompts, TRIS_ADMIN, type TriAdmin } from '@/lib/admin/queries';
import type { AdminPromptFilters as FiltresListe } from '@/lib/admin/queries';
import { listAdminTags } from '@/lib/admin/tags';
import { AdminPromptFilters } from '@/components/filters/admin-prompt-filters';
import { MemoireDesFiltres } from '@/components/admin/memoire-des-filtres';
import { AdminPromptRowItem } from '@/components/admin/prompt-row';
import { CaseDeSelection, SelectionEnMasse } from '@/components/admin/selection-en-masse';
import { CONTENT_STATUS, LIBRARIES, MODES, type Library, type Mode } from '@/lib/constants';
import type { Enums } from '@/lib/supabase/database.types';

export const metadata = { title: 'Raccourcis' };

/**
 * La liste d'administration, pensee pour un catalogue qui grossit.
 *
 * Elle n'annoncait que « page suivante ». On ignorait combien de raccourcis
 * un filtre retenait — donc s'il en retenait trois ou trois mille — et l'on
 * ne pouvait pas revenir en arriere. A quelques centaines d'entrees c'est
 * genant ; a plusieurs milliers, savoir ou l'on se trouve est la premiere
 * chose dont on a besoin avant d'ouvrir quoi que ce soit.
 */
export default async function AdminPromptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const asString = (value: string | string[] | undefined) =>
    typeof value === 'string' && value ? value : undefined;

  const mode = asString(params.mode);
  const status = asString(params.statut);
  const acces = asString(params.acces);
  const visuel = asString(params.visuel);
  const tri = asString(params.tri);
  const bibliotheque = asString(params.bibliotheque);

  // Le type contextuel garde les litteraux : sans lui, « gratuit » redevient
  // `string` dans l'objet et ne correspond plus a la liste fermee.
  const filters: FiltresListe = {
    search: asString(params.q),
    mode: MODES.includes(mode as Mode) ? (mode as Mode) : undefined,
    status: CONTENT_STATUS.includes(status as Enums<'content_status'>)
      ? (status as Enums<'content_status'>)
      : undefined,
    categoryId: asString(params.categorie),
    // Listes fermees : une valeur inconnue arrivant par l'URL est ignoree,
    // jamais transmise a la requete.
    access: acces === 'gratuit' || acces === 'premium' ? acces : undefined,
    media: visuel === 'avec' || visuel === 'sans' ? visuel : undefined,
    library: LIBRARIES.includes(bibliotheque as Library) ? (bibliotheque as Library) : undefined,
    tagId: asString(params.tag),
    tri: tri && tri in TRIS_ADMIN ? (tri as TriAdmin) : undefined,
    page: Math.max(Number(asString(params.page) ?? 1) || 1, 1),
  };

  // Ce que la memoire retient : l'adresse de la liste, sans le point
  // d'interrogation. Reconstruite depuis les filtres relus plutot que prise
  // telle quelle — un parametre inconnu arrivant par l'URL ne doit pas se
  // retrouver memorise puis repose a chaque visite.
  const recherche = (() => {
    const suite = new URLSearchParams();
    if (params.q && typeof params.q === 'string') suite.set('q', params.q);
    if (mode) suite.set('mode', mode);
    if (status) suite.set('statut', status);
    if (acces) suite.set('acces', acces);
    if (visuel) suite.set('visuel', visuel);
    if (bibliotheque) suite.set('bibliotheque', bibliotheque);
    if (typeof params.tag === 'string' && params.tag) suite.set('tag', params.tag);
    if (tri) suite.set('tri', tri);
    const page = Number(asString(params.page) ?? 1) || 1;
    if (page > 1) suite.set('page', String(page));
    return suite.toString();
  })();

  // Les categories ne sont plus chargees : le filtre qui les listait a ete
  // retire, et c'etait son seul lecteur. Une requete de moins par affichage
  // de liste, sur l'ecran le plus visite de l'administration.
  const [{ items, hasMore, total, parPage }, tags] = await Promise.all([
    listAdminPrompts(filters),
    listAdminTags(),
  ]);

  /** L'adresse de la meme liste, a une page ou un tri pres. */
  const adresse = (changements: { page?: number; tri?: TriAdmin }) => {
    const suite = new URLSearchParams();
    if (filters.search) suite.set('q', filters.search);
    if (filters.mode) suite.set('mode', filters.mode);
    if (filters.status) suite.set('statut', filters.status);
    if (filters.categoryId) suite.set('categorie', filters.categoryId);
    if (filters.access) suite.set('acces', filters.access);
    if (filters.media) suite.set('visuel', filters.media);
    if (filters.library) suite.set('bibliotheque', filters.library);
    if (filters.tagId) suite.set('tag', filters.tagId);
    const triRetenu = changements.tri ?? filters.tri;
    if (triRetenu) suite.set('tri', triRetenu);
    const page = changements.page ?? filters.page;
    if (page > 1) suite.set('page', String(page));
    return `/admin/raccourcis${suite.size > 0 ? `?${suite}` : ''}`;
  };

  const premier = items.length === 0 ? 0 : (filters.page - 1) * parPage + 1;
  const dernier = (filters.page - 1) * parPage + items.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Raccourcis</h1>
        <Link
          href="/admin/raccourcis/nouveau"
          className="touch-target inline-flex items-center rounded-[color:var(--radius-control)] bg-[color:var(--color-brand)] px-3 text-sm font-medium text-white"
        >
          Nouveau
        </Link>
      </div>

      {/* Le retour d'une suppression : la page d'ou elle partait n'existe
          plus, donc c'est ici qu'elle se dit. Sans ce mot, la liste revient
          simplement plus courte, et rien ne confirme le geste. */}
      {asString(params.supprime) === '1' ? (
        <p
          role="status"
          className="rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-sky)] p-3 text-[13px] leading-relaxed text-[color:var(--color-night)]"
        >
          Commande supprimée. Le journal d’administration en garde la trace.
        </p>
      ) : null}

      {/* La liste se souvient d'ou l'on en etait, le temps de l'onglet :
          filtres, tri et page. Une feuille, jamais une enveloppe — elle ne
          rend rien et ne retarde pas l'affichage de la liste.
          Pas apres une suppression : la restauration remplacerait l'adresse,
          et le message de confirmation disparaitrait avant d'etre lu. */}
      {params.supprime ? null : <MemoireDesFiltres recherche={recherche} />}

      <AdminPromptFilters
        search={filters.search}
        mode={filters.mode}
        status={filters.status}
        access={filters.access}
        media={filters.media}
        library={filters.library}
        tagId={filters.tagId}
        tags={tags}
      />

      {/* Combien, et ou l'on en est. Le tri se change sans perdre les filtres :
          c'est la meme liste, regardee dans un autre ordre. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[color:var(--color-muted)]">
          {total === 0 ? (
            'Aucun raccourci'
          ) : (
            <>
              <span className="font-medium text-[color:var(--color-night)]">
                {premier}–{dernier}
              </span>{' '}
              sur {total.toLocaleString('fr-FR')}
            </>
          )}
        </p>

        <nav aria-label="Trier la liste" className="flex flex-wrap gap-1.5">
          {(Object.keys(TRIS_ADMIN) as TriAdmin[]).map((cle) => {
            const actif = (filters.tri ?? 'modifie') === cle;
            return (
              <Link
                key={cle}
                href={adresse({ tri: cle, page: 1 })}
                aria-current={actif ? 'true' : undefined}
                className={`inline-flex h-8 items-center rounded-full border px-3 text-[13px] font-medium ${
                  actif
                    ? 'border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-white'
                    : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-night)]'
                }`}
              >
                {TRIS_ADMIN[cle].libelle}
              </Link>
            );
          })}
        </nav>
      </div>

      {items.length === 0 ? (
        <p className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 text-center text-[15px] text-[color:var(--color-muted)]">
          Aucun raccourci ne correspond à ces filtres.
        </p>
      ) : (
        <SelectionEnMasse>
          <ul className="space-y-2">
            {items.map((prompt) => (
              <li key={prompt.id} className="flex items-start gap-2.5">
                <CaseDeSelection id={prompt.id} nom={prompt.name} />
                <div className="min-w-0 flex-1">
                  <AdminPromptRowItem prompt={prompt} />
                </div>
              </li>
            ))}
          </ul>
        </SelectionEnMasse>
      )}

      {/* Les deux sens. Une liste qui n'avance que vers l'avant oblige a
          repartir du debut des qu'on depasse ce qu'on cherchait. */}
      {total > parPage ? (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-2">
          {filters.page > 1 ? (
            <Link
              href={adresse({ page: filters.page - 1 })}
              className="inline-flex h-11 items-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-sm font-medium text-[color:var(--color-night)]"
            >
              Page précédente
            </Link>
          ) : (
            <span />
          )}
          {hasMore ? (
            <Link
              href={adresse({ page: filters.page + 1 })}
              className="inline-flex h-11 items-center rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-sm font-medium text-[color:var(--color-night)]"
            >
              Page suivante
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
