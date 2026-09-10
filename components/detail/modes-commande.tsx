/**
 * Ce que la commande sait faire en plus de son cas principal.
 *
 * Cent trente et un raccourcis sont devenus des modes d'une commande plus
 * large : /eventposter, /promoflyer et /streetposter sont trois facons de
 * demander /poster. Le regroupement a du sens — c'est le meme travail — mais
 * sans cette liste il ne se voit nulle part, et quelqu'un qui cherchait une
 * affiche d'evenement repart en pensant que la commande ne la fait pas.
 *
 * Les libelles ne sont pas cliquables, et c'est voulu : ce ne sont pas des
 * filtres mais des mots a dire a l'IA. Un faux bouton qui ne repond pas au
 * doigt serait pire qu'une simple liste.
 */
export function ModesCommande({ modes }: { modes: string[] }) {
  if (modes.length === 0) return null;

  return (
    <>
      <p className="text-[length:var(--texte-meta)] leading-relaxed text-[color:var(--color-muted)]">
        Précisez ce que vous voulez obtenir, la commande s’y adapte.
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {modes.map((mode) => (
          <li
            key={mode}
            className="rounded-full bg-[color:var(--color-sky)] px-2.5 py-1 text-[length:var(--texte-meta)] text-[color:var(--color-night)]"
          >
            {mode}
          </li>
        ))}
      </ul>
    </>
  );
}
