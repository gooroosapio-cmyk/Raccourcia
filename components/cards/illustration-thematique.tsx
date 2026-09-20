import type { MotifIllustration } from '@/lib/ui/motifs';

/**
 * Le dessin d'une carte sans visuel.
 *
 * Un trait, pas une photographie. Une commande de Textes ne rend pas
 * d'image : lui en poser une promettrait un resultat qu'elle ne produit
 * pas. Le motif dit de quoi elle parle — un personnage, un de, un
 * graphique — sans rien annoncer sur la forme de ce qu'elle rendra.
 *
 * Grand et centre, en filigrane derriere le texte : il donne a la galerie
 * le relief qui lui manquait sans disputer sa place a l'apercu, qui reste
 * la seule chose qu'on lit vraiment.
 */
export function IllustrationThematique({ motif }: { motif: MotifIllustration }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ backgroundColor: motif.fond }}
    >
      <svg
        width="96"
        height="96"
        viewBox="0 0 48 48"
        fill="none"
        // Le dessin reste en retrait : il habille le cadre, il ne le prend
        // pas. A pleine opacite, le titre pose par-dessus deviendrait
        // illisible sur la moitie des motifs.
        style={{ color: motif.encre, opacity: 0.22 }}
      >
        <Trait cle={motif.cle} />
      </svg>
    </span>
  );
}

/**
 * Les traits eux-memes.
 *
 * Un seul jeu de proportions — 48x48, trait de 2,4 — pour que deux cartes
 * voisines ne donnent pas l'impression de venir de deux applications.
 *
 * Exporte parce que les cartes de rayon de la Bibliotheque s'en servent
 * aussi. Un second jeu de dessins la-bas ferait deux vocabulaires pour une
 * meme idee — un personnage n'aurait pas la meme tete selon l'ecran.
 */
export function Trait({ cle }: { cle: string }) {
  const commun = {
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (cle === 'personnage') {
    return (
      <>
        <circle cx="24" cy="17" r="7.5" {...commun} />
        <path d="M10 41a14 14 0 0 1 28 0" {...commun} />
      </>
    );
  }

  if (cle === 'jeu') {
    return (
      <>
        <rect x="8" y="8" width="32" height="32" rx="6" {...commun} />
        <circle cx="17" cy="17" r="2.6" fill="currentColor" />
        <circle cx="31" cy="31" r="2.6" fill="currentColor" />
        <circle cx="24" cy="24" r="2.6" fill="currentColor" />
      </>
    );
  }

  if (cle === 'analyse') {
    return (
      <>
        <path d="M9 39V15M19 39V23M29 39V10M39 39V27" {...commun} />
        <path d="M6 43h36" {...commun} />
      </>
    );
  }

  if (cle === 'redaction') {
    return (
      <>
        <path d="M32 8l8 8L18 38l-10 2 2-10z" {...commun} />
        <path d="M27 13l8 8" {...commun} />
      </>
    );
  }

  if (cle === 'document') {
    return (
      <>
        <path d="M12 6h16l8 8v28H12z" {...commun} />
        <path d="M28 6v9h9" {...commun} />
        <path d="M18 26h12M18 33h8" {...commun} />
      </>
    );
  }

  if (cle === 'apprentissage') {
    return (
      <>
        <path d="M24 9 6 18l18 9 18-9z" {...commun} />
        <path d="M13 22v11c0 2 5 5 11 5s11-3 11-5V22" {...commun} />
      </>
    );
  }

  // « echange » : le motif d'arrivee, et celui qu'on voit le plus souvent.
  return (
    <>
      <path d="M8 13h32v22H8z" {...commun} />
      <path d="m8 15 16 12 16-12" {...commun} />
    </>
  );
}
