/**
 * Etat des visuels d'un raccourci, dans la liste d'administration.
 *
 * La question posee devant cette liste n'est pas « ce raccourci a-t-il une
 * image ? » mais « puis-je passer au suivant ? ». La pastille repond donc en
 * un coup d'oeil : verte quand les deux visuels sont la, ambre quand il en
 * manque un, grise quand la fiche est encore nue.
 *
 * Un raccourci texte n'affiche pas de comparaison Avant/Apres : lui reclamer
 * deux visuels serait un reproche sans objet, alors seule la couverture
 * compte.
 */
export function MediaBadge({
  avant,
  apres,
  compare,
}: {
  avant: boolean;
  apres: boolean;
  /** Vrai pour les raccourcis image, qui montrent un avant et un apres. */
  compare: boolean;
}) {
  const attendus = compare ? 2 : 1;
  const presents = compare ? Number(avant) + Number(apres) : Number(apres);

  const complet = presents === attendus;
  const vide = presents === 0;

  const libelle = complet
    ? compare
      ? 'Avant et après chargés'
      : 'Visuel chargé'
    : vide
      ? 'Aucun visuel'
      : avant
        ? 'Avant seul'
        : 'Après seul';

  const ton = complet
    ? 'bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]'
    : vide
      ? 'bg-[color:var(--color-canvas)] text-[color:var(--color-muted)]'
      : 'bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]';

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${ton}`}
      title={libelle}
    >
      <span aria-hidden="true" className="font-mono">
        {presents}/{attendus}
      </span>
      <span className="sr-only">{libelle}</span>
      <span aria-hidden="true">{complet ? 'Visuels' : 'Visuel'}</span>
    </span>
  );
}
