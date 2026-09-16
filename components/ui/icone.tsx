/**
 * Une icone du kit, rendue en ligne.
 *
 * Le kit livre des SVG complets plutot qu'un sprite : un sprite se charge
 * par `<use href="fichier.svg#id">`, et ce mecanisme casse selon la
 * configuration de securite du navigateur — l'icone disparait sans erreur,
 * ce qui est le pire des echecs.
 *
 * Le dessin est injecte tel quel. Ce n'est pas une saisie d'utilisateur :
 * c'est un fichier du depot, genere par `scripts/generer-kit-ui.mjs`, qui
 * refuse a la generation tout contenu autre qu'un trace.
 *
 * L'etiquette vient de l'appelant, jamais du dessin. Une icone qui double un
 * texte deja lisible reste muette — l'entendre deux fois n'apprend rien.
 */
export function Icone({
  svg,
  taille = 24,
  libelle,
  className,
}: {
  /** Le dessin, tel que `lib/ui/icones` le rend. */
  svg: string;
  taille?: number;
  /** Ce que l'icone nomme, quand elle est seule a le nommer. */
  libelle?: string;
  className?: string;
}) {
  return (
    <span
      className={`svg-kit inline-block shrink-0${className ? ` ${className}` : ''}`}
      style={{ width: taille, height: taille }}
      {...(libelle ? { role: 'img', 'aria-label': libelle } : { 'aria-hidden': true })}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
