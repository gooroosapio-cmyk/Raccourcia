import { AILogo } from '@/components/brand/ai-logos';
import type { Enums } from '@/lib/supabase/database.types';

type Provider = { key: string; name: string; compatibility: Enums<'compatibility_level'> };

/**
 * IA reellement compatibles.
 *
 * Seules les IA declarees compatibles apparaissent : afficher les trois
 * logos en permanence donnerait une promesse que le raccourci ne tient pas.
 *
 * Le logo de chaque marque remplace la pastille de couleur : un rond bleu ne
 * disait pas « Gemini », il fallait lire le nom a cote pour le savoir.
 */
export function CompatibilityList({
  providers,
  compact = false,
  selected,
  onSelect,
}: {
  providers: Provider[];
  /** Variante des cartes : une ligne de noms, sans interaction. */
  compact?: boolean;
  selected?: string;
  onSelect?: (key: string) => void;
}) {
  if (providers.length === 0) return null;

  if (compact) {
    return (
      <p className="flex items-center gap-1.5 text-[12px] text-[color:var(--color-muted)]">
        {providers.map((entry) => (
          <span key={entry.key} className="flex items-center gap-1">
            <AILogo providerKey={entry.key} name={entry.name} taille={14} decoratif />
            {entry.name}
          </span>
        ))}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {providers.map((entry) => {
        const actif = entry.key === selected;
        const apparence = `touch-target inline-flex items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium transition-colors duration-[var(--duration-fast)] ${
          actif
            ? 'bg-[color:var(--color-brand)] text-white'
            : 'bg-[color:var(--color-sky)] text-[color:var(--color-night)]'
        }`;

        // Sans choix a faire, la liste enonce les IA compatibles : c'est une
        // information, pas une commande. Un bouton y serait une cible de 44 px
        // qui ne repond a rien — et la fiche publique est rendue sur le
        // serveur, ou un gestionnaire d'evenement ne peut pas exister.
        if (!onSelect) {
          return (
            <span key={entry.key} className={apparence}>
              <AILogo providerKey={entry.key} name={entry.name} taille={18} decoratif />
              {entry.name}
            </span>
          );
        }

        return (
          <button
            key={entry.key}
            type="button"
            onClick={() => onSelect(entry.key)}
            aria-pressed={actif}
            className={apparence}
          >
            <AILogo providerKey={entry.key} name={entry.name} taille={18} decoratif />
            {entry.name}
          </button>
        );
      })}
    </div>
  );
}
