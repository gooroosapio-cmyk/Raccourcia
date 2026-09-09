import type { PromptCard } from '@/lib/catalog/types';

/**
 * Une rangee thematique de l'Accueil.
 *
 * Ne s'affiche pas quand elle est vide : un titre « Vos favoris » suivi d'un
 * message « aucun favori » prend la place de deux cartes pour ne rien
 * apprendre. L'absence de section est deja l'information.
 *
 * Le titre porte son propre `id` : la liste qu'il annonce s'y rattache, et un
 * lecteur d'ecran qui parcourt les regions sait ce que chacune contient.
 */
export function SectionAccueil({
  id,
  titre,
  aide,
  prompts,
  children,
}: {
  id: string;
  titre: string;
  /** Une ligne pour dire d'ou vient cette selection. Facultative. */
  aide?: string;
  prompts: PromptCard[];
  /** La grille, rendue par l'appelant : elle porte l'etat de la fiche. */
  children: React.ReactNode;
}) {
  if (prompts.length === 0) return null;

  return (
    <section aria-labelledby={id} className="space-y-2 pt-1">
      <div>
        <h2
          id={id}
          className="text-[length:var(--texte-section)] font-semibold text-[color:var(--color-night)]"
        >
          {titre}
        </h2>
        {aide ? (
          <p className="text-[length:var(--texte-meta)] text-[color:var(--color-muted)]">{aide}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
