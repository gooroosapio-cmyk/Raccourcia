import { OUTPUT_FORMAT_HINTS, OUTPUT_FORMAT_LABELS, type OutputFormatKind } from '@/lib/constants';

/**
 * Formats reellement produits par la commande.
 *
 * Seuls les formats declares apparaissent. Afficher "Image, Texte, PDF" sur
 * toutes les fiches ferait croire a un choix qui n'existe pas, et rendrait la
 * section inutile a lire.
 */
export function OutputFormatList({
  formats,
  compact = false,
}: {
  formats: OutputFormatKind[];
  compact?: boolean;
}) {
  if (formats.length === 0) return null;

  if (compact) {
    return (
      <p className="flex items-center gap-1 text-[12px] text-[color:var(--color-muted)]">
        <FormatIcon kind={formats[0]!} />
        {formats.map((format) => OUTPUT_FORMAT_LABELS[format]).join(', ')}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-2">
      {formats.map((format) => (
        <li
          key={format}
          className="flex items-center gap-2.5 rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2.5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[color:var(--color-sky)] text-[color:var(--color-brand)]">
            <FormatIcon kind={format} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-medium text-[color:var(--color-night)]">
              {OUTPUT_FORMAT_LABELS[format]}
            </span>
            {OUTPUT_FORMAT_HINTS[format] ? (
              <span className="block truncate text-[12px] text-[color:var(--color-muted)]">
                {OUTPUT_FORMAT_HINTS[format]}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FormatIcon({ kind }: { kind: OutputFormatKind }) {
  const commun = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': true,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (kind) {
    case 'image':
      return (
        <svg {...commun}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <circle cx="8.5" cy="10" r="1.5" />
          <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
        </svg>
      );
    case 'pdf':
    case 'document':
      return (
        <svg {...commun}>
          <path d="M6 3h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
          <path d="M13 3v5h5" />
        </svg>
      );
    case 'presentation':
      return (
        <svg {...commun}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M12 16v4m-3 0h6" />
        </svg>
      );
    case 'tableur':
      return (
        <svg {...commun}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M9 10v10" />
        </svg>
      );
    case 'code':
      return (
        <svg {...commun}>
          <path d="m9 8-4 4 4 4m6-8 4 4-4 4" />
        </svg>
      );
    case 'audio':
      return (
        <svg {...commun}>
          <path d="M12 4v16M8 8v8M4 11v2m12-5v8m4-5v2" />
        </svg>
      );
    case 'video':
      return (
        <svg {...commun}>
          <rect x="3" y="5" width="13" height="14" rx="2.5" />
          <path d="m16 10 5-3v10l-5-3" />
        </svg>
      );
    default:
      return (
        <svg {...commun}>
          <path d="M5 6h14M5 11h14M5 16h9" />
        </svg>
      );
  }
}
