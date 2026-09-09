/**
 * Le film publicitaire, dans la page de vente.
 *
 * `preload="none"` n'est pas un detail : le fichier pese dix-sept megaoctets,
 * et la page vise d'abord des telephones sur des forfaits ou ce poids se
 * compte. Rien du film n'est telecharge avant qu'on appuie sur lecture; ce
 * que l'on voit d'ici la est l'affiche, qui pese quatre-vingt-neuf kilooctets.
 *
 * Aucune lecture automatique, pour la meme raison : demarrer seul ferait payer
 * le film a qui ne l'a pas demande, et couperait la lecture du titre.
 *
 * `playsInline` garde la lecture dans la page sur iOS, ou une video passe
 * sinon en plein ecran et fait quitter la page de vente.
 *
 * Le cadre porte le rapport 16/9 en dur : sans lui, la page sauterait de
 * toute la hauteur du lecteur au moment ou l'affiche arrive.
 */
export function Film() {
  return (
    <figure className="mx-auto w-full max-w-3xl">
      <video
        className="aspect-video w-full rounded-[20px] border border-[color:var(--color-line)] bg-[color:var(--color-night)] shadow-[var(--shadow-card)]"
        controls
        preload="none"
        playsInline
        poster="/landing/film-affiche.webp"
        width={1920}
        height={1080}
      >
        <source src="/landing/film-raccourcia.mp4" type="video/mp4" />
        Votre navigateur ne sait pas lire cette vidéo.
      </video>
      <figcaption className="mt-3 text-center text-[length:var(--texte-carte)] text-[color:var(--color-muted)]">
        RaccourcIA en 45 secondes.
      </figcaption>
    </figure>
  );
}
