import { INPUT_EXAMPLE_LABELS, type InputExampleKind } from '@/lib/constants';

/**
 * Entrees acceptees par la commande.
 *
 * Chaque tuile decrit ce que l'utilisateur doit fournir. Seules les entrees
 * declarees compatibles sont montrees : remplir la grille avec des entrees
 * que la commande ne sait pas traiter produirait des essais rates.
 */
export function InputExampleList({ inputs }: { inputs: InputExampleKind[] }) {
  if (inputs.length === 0) return null;

  return (
    <ul className="grid grid-cols-3 gap-2">
      {inputs.slice(0, 4).map((input) => (
        <li
          key={input}
          className="flex flex-col items-center gap-1.5 rounded-[color:var(--radius-control)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-2 py-3 text-center"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--color-sky)] text-[color:var(--color-brand)]">
            <InputIcon kind={input} />
          </span>
          <span className="text-[12px] font-medium leading-tight text-[color:var(--color-night)]">
            {INPUT_EXAMPLE_LABELS[input]}
          </span>
        </li>
      ))}
    </ul>
  );
}

function InputIcon({ kind }: { kind: InputExampleKind }) {
  const commun = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': true,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (kind) {
    case 'photo_personne':
      return (
        <svg {...commun}>
          <circle cx="12" cy="8.5" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case 'photo_lieu':
      return (
        <svg {...commun}>
          <path d="M3 20V9l9-6 9 6v11" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );
    case 'photo_produit':
      return (
        <svg {...commun}>
          <path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z" />
          <path d="M3 7.5 12 12l9-4.5M12 12v9" />
        </svg>
      );
    case 'capture_ecran':
      return (
        <svg {...commun}>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8" />
        </svg>
      );
    case 'document_pdf':
      return (
        <svg {...commun}>
          <path d="M6 3h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
          <path d="M13 3v5h5" />
        </svg>
      );
    case 'tableau':
      return (
        <svg {...commun}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M9 10v10" />
        </svg>
      );
    case 'url':
      return (
        <svg {...commun}>
          <path d="M10 13a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7L11.4 6" />
          <path d="M14 11a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.2-1.2" />
        </svg>
      );
    case 'brief':
      return (
        <svg {...commun}>
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
          <path d="M8 9h8M8 13h8M8 17h4" />
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
