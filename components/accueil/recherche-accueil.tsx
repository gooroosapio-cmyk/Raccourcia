import { LIBRARY_LABELS, type Library } from '@/lib/constants';
import { Icone } from '@/components/ui/icone';
import { iconeDuRole } from '@/lib/ui/icones';

/**
 * La recherche de l'accueil, visible des l'arrivee.
 *
 * Un formulaire ordinaire, sans JavaScript : il envoie a `/app` le terme et
 * l'univers courant. La recherche commence dans cet univers ; la case
 * « dans les trois bibliotheques » l'elargit explicitement, plutot que de
 * laisser croire qu'une commande n'existe pas parce qu'elle est ailleurs.
 */
export function RechercheAccueil({
  univers,
  terme = '',
  partout = false,
}: {
  univers: Library;
  terme?: string;
  partout?: boolean;
}) {
  return (
    <form action="/app" method="get" role="search" className="space-y-1.5">
      <label htmlFor="recherche-accueil" className="sr-only">
        Rechercher une commande
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]">
          <Icone svg={iconeDuRole('search')} taille={20} />
        </span>
        <input
          id="recherche-accueil"
          type="search"
          name="q"
          defaultValue={terme}
          placeholder="Rechercher une commande"
          maxLength={80}
          enterKeyHint="search"
          className="h-12 w-full rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] pl-11 pr-3.5 text-[16px] text-[color:var(--color-night)] outline-none placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-brand)] focus:shadow-[0_0_0_3px_var(--color-brand-soft)]"
        />
      </div>
      <input type="hidden" name="bibliotheque" value={univers} />
      <label className="flex min-h-11 items-center gap-2 text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">
        <input
          type="checkbox"
          name="partout"
          value="1"
          defaultChecked={partout}
          className="h-5 w-5 accent-[color:var(--color-brand)]"
        />
        Rechercher dans les trois bibliothèques, pas seulement {LIBRARY_LABELS[univers]}
      </label>
    </form>
  );
}
