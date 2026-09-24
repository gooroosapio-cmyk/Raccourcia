import Image from 'next/image';
import Link from 'next/link';

import { compterLesAlertes, inventorierLesMedias } from '@/lib/admin/qualite';

export const metadata = { title: 'Médias' };

const ROLES: Record<string, string> = {
  before: 'Avant',
  after: 'Après',
  thumbnail: 'Vignette',
  example: 'Exemple',
  cover: 'Couverture',
};

/**
 * Medias : l'inventaire des visuels et leur provenance.
 *
 * Deux provenances seulement, et c'est `created_by` qui tranche (CLAUDE.md) :
 * un visuel depose par la console porte son auteur ; un visuel sans auteur
 * est anterieur a ce controle et se verifie avant toute decision. Cette page
 * montre, elle n'efface rien — un visuel se retire depuis la commande qui le
 * porte, avec son bilan.
 *
 * Le depot se fait dans l'editeur de la commande (onglet Medias) : c'est la
 * que l'association a la bonne commande et au bon role est certaine.
 */
export default async function MediasPage() {
  const [inventaire, alertes] = await Promise.all([inventorierLesMedias(), compterLesAlertes()]);
  const manquants = alertes.find((ligne) => ligne.alerte === 'visuel_manquant')?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--color-night)]">Médias</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          {inventaire.total} visuel{inventaire.total > 1 ? 's' : ''} en base. Un visuel se dépose et
          se retire depuis sa commande, onglet Médias.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Chiffre libelle="Déposés par la console" valeur={inventaire.administration} ton="succes" />
        <Chiffre libelle="Sans auteur, à vérifier" valeur={inventaire.sansAuteur} ton="alerte" />
        <Chiffre libelle="Après (résultats)" valeur={inventaire.parRole.apres} />
        <Chiffre libelle="Avant (références)" valeur={inventaire.parRole.avant} />
      </section>

      {manquants > 0 ? (
        <Link
          href="/admin/raccourcis?alerte=visuel_manquant"
          className="flex min-h-11 items-center justify-between gap-3 rounded-[color:var(--radius-card)] border border-[color:var(--color-warning)] bg-[color:var(--color-warning-soft)] px-4 py-3 text-[15px] text-[color:var(--color-night)]"
        >
          <span>
            {manquants} commande{manquants > 1 ? 's' : ''} Visuels attend
            {manquants > 1 ? 'ent' : ''} son visuel de résultat
          </span>
          <span className="shrink-0 font-medium text-[color:var(--color-brand)]">Voir</span>
        </Link>
      ) : null}

      <section className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
          Derniers visuels
        </h2>
        {inventaire.recents.length === 0 ? (
          <p className="mt-2 text-[14px] text-[color:var(--color-muted)]">Aucun visuel en base.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {inventaire.recents.map((media) => (
              <li key={media.id}>
                <Link href={`/admin/raccourcis/${media.promptId}`} className="block">
                  <span className="relative block aspect-[4/5] overflow-hidden rounded-[10px] bg-[color:var(--color-canvas)]">
                    <Image
                      src={media.url}
                      alt={`${ROLES[media.role] ?? media.role} — ${media.nom}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 200px"
                      className="object-cover"
                    />
                  </span>
                  <span className="mt-1 block truncate text-[13px] font-medium text-[color:var(--color-night)]">
                    {media.nom}
                  </span>
                  <span className="block truncate text-[12px] text-[color:var(--color-muted)]">
                    {ROLES[media.role] ?? media.role} ·{' '}
                    {media.administration ? 'console' : 'sans auteur'} ·{' '}
                    {new Date(media.creeLe).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Chiffre({
  libelle,
  valeur,
  ton,
}: {
  libelle: string;
  valeur: number;
  ton?: 'succes' | 'alerte';
}) {
  const couleur =
    ton === 'succes'
      ? 'text-[color:var(--color-success)]'
      : ton === 'alerte' && valeur > 0
        ? 'text-[color:var(--color-warning)]'
        : 'text-[color:var(--color-night)]';
  return (
    <div className="rounded-[color:var(--radius-card)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3">
      <p className={`text-2xl font-semibold ${couleur}`}>{valeur}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-[color:var(--color-muted)]">{libelle}</p>
    </div>
  );
}
