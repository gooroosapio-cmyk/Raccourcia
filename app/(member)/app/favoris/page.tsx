import { getAccessState } from '@/lib/access/entitlement';
import { getFavorites } from '@/lib/catalog/queries';
import { PromptGrid } from '@/components/cards/prompt-grid';
import { ChoixUnivers } from '@/components/accueil/choix-univers';
import { EmptyState } from '@/components/ui/states';
import { NetworkError } from '@/components/ui/network-error';
import { Icone } from '@/components/ui/icone';
import { iconeDuRole } from '@/lib/ui/icones';
import { isCatalogUnavailable } from '@/lib/catalog/errors';
import { LIBRARIES, LIBRARY_LABELS, type Library } from '@/lib/constants';

export const metadata = { title: 'Favoris' };

const estUnivers = (valeur: unknown): valeur is Library => LIBRARIES.includes(valeur as Library);

/** Minuscules et sans accents : « Resume » retrouve « Résumer ». */
const normaliser = (texte: string) =>
  texte
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * Favoris : les commandes gardees d'un coeur, et rien d'autre.
 *
 * Le rapport de refonte : les trois univers, une recherche, un etat vide
 * utile, et la meme grille que la Bibliotheque — le coeur y est le meme,
 * sur la carte, dans la fiche et dans Decouvrir.
 *
 * PLUS DE RENVOI VERS L'OFFRE. La page redirigeait tout compte sans acces
 * complet vers la fenetre d'achat : un membre qui avait garde trois
 * commandes gratuites ne pouvait pas les retrouver. Chacun voit ses
 * favoris ; un visiteur, qui n'en a pas, est invite a se connecter.
 *
 * « Tout » par defaut : une liste personnelle filtree d'office sur un
 * univers cacherait ce qu'on a range ailleurs.
 */
export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const univers = estUnivers(params.univers) ? params.univers : null;
  const terme = typeof params.q === 'string' ? params.q.trim().slice(0, 80) : '';

  let etat: Awaited<ReturnType<typeof getAccessState>> | null = null;
  let favoris: Awaited<ReturnType<typeof getFavorites>> = [];
  let injoignable = false;
  try {
    etat = await getAccessState();
    if (etat.isMember) favoris = await getFavorites();
  } catch (error) {
    if (!isCatalogUnavailable(error)) throw error;
    injoignable = true;
  }

  const titre = (
    <h1 className="text-[length:var(--texte-page)] font-bold leading-tight text-[color:var(--color-night)]">
      Favoris
    </h1>
  );

  if (injoignable || !etat) {
    return (
      <div className="space-y-4 pt-1">
        {titre}
        <NetworkError />
      </div>
    );
  }

  if (!etat.isMember) {
    return (
      <div className="space-y-4 pt-1">
        {titre}
        <EmptyState
          title="Retrouvez vos commandes d’un geste"
          body="Connectez-vous pour garder vos commandes en favori et les retrouver sur tous vos appareils."
          actionLabel="Se connecter"
          actionHref="/connexion?suite=/app/favoris"
        />
      </div>
    );
  }

  const cible = normaliser(terme);
  const visibles = favoris
    .filter((carte) => !univers || carte.library === univers)
    .filter(
      (carte) =>
        !cible ||
        normaliser(`${carte.name} ${carte.command} ${carte.shortDescription}`).includes(cible),
    );

  const base = '/app/favoris';

  return (
    <div className="space-y-4 pt-1">
      {titre}

      {favoris.length > 0 ? (
        <>
          <form action={base} method="get" role="search">
            {univers ? <input type="hidden" name="univers" value={univers} /> : null}
            <label htmlFor="recherche-favoris" className="sr-only">
              Retrouver un favori
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]">
                <Icone svg={iconeDuRole('search')} taille={20} />
              </span>
              <input
                id="recherche-favoris"
                type="search"
                name="q"
                defaultValue={terme}
                placeholder="Retrouver un favori"
                maxLength={80}
                enterKeyHint="search"
                className="h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] pl-11 pr-3.5 text-[16px] text-[color:var(--color-night)] outline-none placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-brand)] focus:shadow-[0_0_0_3px_var(--color-brand-soft)]"
              />
            </div>
          </form>
          <ChoixUnivers actif={univers} base={base} avecTout />
        </>
      ) : null}

      {favoris.length === 0 ? (
        <EmptyState
          title="Vos prochaines idées commencent ici"
          body="Touchez le cœur d’une commande pour la retrouver ici, sur la carte comme dans la fiche ou Découvrir."
          actionLabel="Parcourir la bibliothèque"
          actionHref="/app/bibliotheque"
        />
      ) : visibles.length === 0 ? (
        <EmptyState
          title={
            terme
              ? `Aucun favori ne correspond à « ${terme} »`
              : `Aucun favori en ${LIBRARY_LABELS[univers!]}`
          }
          body={
            terme
              ? 'Essayez un autre mot, ou cherchez dans tous vos favoris.'
              : 'Les commandes que vous gardez dans cet univers apparaîtront ici.'
          }
          actionLabel={terme ? 'Voir tous mes favoris' : `Explorer ${LIBRARY_LABELS[univers!]}`}
          actionHref={terme ? base : `/app/bibliotheque?univers=${univers}`}
        />
      ) : (
        <PromptGrid
          prompts={visibles}
          locked={!etat.hasFullAccess}
          visiteur={false}
          emptyState={null}
        />
      )}
    </div>
  );
}
