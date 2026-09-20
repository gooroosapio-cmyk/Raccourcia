import { INPUT_EXAMPLE_LABELS, type InputExampleKind } from '@/lib/constants';

/**
 * Ce qu'il faut donner a la commande, en une liste.
 *
 * LE PROBLEME QU'ELLE CORRIGE. La fiche montrait deux tuiles encadrees
 * tirees de `input_examples` — « Texte brut », « Brief », « Capture
 * d'ecran », « Photo de produit ». Ces valeurs sont celles que l'import a
 * posees par defaut, les memes sur des centaines de cartes : sur une
 * commande qui transforme un portrait, on lisait « Texte brut » et
 * « Brief » au-dessus d'une phrase qui disait, elle, « Une photo nette de
 * la personne ». Deux reponses contradictoires a la meme question, et
 * c'etait la mauvaise qui avait les icones.
 *
 * CE QU'ON MONTRE A LA PLACE. Ce que le catalogue dit reellement de la
 * commande :
 *
 *   * pour une commande IMAGE, le temoin qu'elle attend — « Une photo
 *     nette de la personne », « Une photo du produit ». C'est la seule
 *     donnee qui distingue une transformation de personne d'une mise en
 *     scene d'objet, et le rayon ne suffit pas ;
 *   * pour une commande TEXTE ou une REFLEXION, les formes acceptees —
 *     document, tableau, lien, texte colle — qui la, sont justes : une
 *     commande de synthese accepte vraiment un PDF ou un texte.
 *
 * Une liste, pas des tuiles. Une tuile par forme prend deux colonnes et
 * quatre lignes pour dire deux mots, et cette place manque en bas de
 * fiche, la ou se decide la copie.
 */
export function AFournir({
  /** Ce que la commande attend, tel que le catalogue l'ecrit. */
  temoin,
  /** La phrase longue, quand le catalogue en donne une. */
  precision,
  /** Les formes acceptees. Utiles hors image, generiques dessus. */
  exemples,
  /** Vrai pour une commande qui produit une image. */
  image,
}: {
  temoin: string | null;
  precision: string | null;
  exemples: InputExampleKind[];
  image: boolean;
}) {
  // Sur une commande image, le temoin fait foi et les formes generiques
  // sont ecartees : elles disent « Texte brut » la ou il faut une photo.
  // Hors image, ce sont elles qui portent l'information.
  const lignes = image
    ? [temoin ?? precision].filter((ligne): ligne is string => Boolean(ligne))
    : exemples.map((exemple) => INPUT_EXAMPLE_LABELS[exemple]);

  if (lignes.length === 0) return null;

  return (
    <section className="mt-4">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
        À fournir
      </h3>

      <ul className="mt-1.5 space-y-1">
        {lignes.map((ligne) => (
          <li
            key={ligne}
            className="flex items-start gap-2 text-[length:var(--texte-corps)] leading-snug text-[color:var(--color-night)]"
          >
            <span
              aria-hidden="true"
              className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-brand)]"
            />
            {ligne}
          </li>
        ))}
      </ul>

      {/* La phrase du catalogue ferme la liste quand elle ajoute quelque
          chose — sur une commande image, elle EST la liste, et la repeter
          dessous ne dirait rien de plus. */}
      {!image && precision ? (
        <p className="mt-1.5 text-[length:var(--texte-meta)] leading-snug text-[color:var(--color-muted)]">
          {precision}
        </p>
      ) : null}
    </section>
  );
}
