import type { Enums } from '@/lib/supabase/database.types';

type Provider = { key: string; name: string; compatibility: Enums<'compatibility_level'> };

/**
 * IA reellement compatibles.
 *
 * Seules les IA declarees compatibles apparaissent : afficher les trois
 * logos en permanence donnerait une promesse que le raccourci ne tient pas.
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
            <ProviderDot providerKey={entry.key} />
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
              <ProviderDot providerKey={entry.key} inverse={actif} />
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
            <ProviderDot providerKey={entry.key} inverse={actif} />
            {entry.name}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Pastille de couleur par IA. Un rond suffit a distinguer trois marques et
 * n'emprunte aucun logo dont nous n'avons pas les droits.
 */
function ProviderDot({ providerKey, inverse = false }: { providerKey: string; inverse?: boolean }) {
  const couleurs: Record<string, string> = {
    chatgpt: '#10a37f',
    claude: '#d97757',
    gemini: '#4285f4',
  };

  return (
    <span
      aria-hidden="true"
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: inverse ? '#ffffff' : (couleurs[providerKey] ?? 'currentColor') }}
    />
  );
}
