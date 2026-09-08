/**
 * Fond d'etoiles filantes de l'accueil.
 *
 * Six traits, six retards, six positions : la repetition d'un motif unique se
 * verrait au bout de trois secondes. Les valeurs sont fixes et non tirees au
 * hasard — un tirage au rendu donnerait un serveur et un client differents,
 * et React signalerait l'ecart a l'hydratation.
 *
 * Purement decoratif : `aria-hidden`, et le conteneur ne prend pas le doigt.
 */
const TRAITS = [
  { gauche: '-6%', haut: '-4%', retard: '0s', duree: '7s', opacite: 0.5 },
  { gauche: '14%', haut: '-12%', retard: '1.4s', duree: '9s', opacite: 0.35 },
  { gauche: '38%', haut: '-8%', retard: '3.1s', duree: '8s', opacite: 0.45 },
  { gauche: '2%', haut: '26%', retard: '4.6s', duree: '10s', opacite: 0.3 },
  { gauche: '52%', haut: '4%', retard: '2.2s', duree: '11s', opacite: 0.28 },
  { gauche: '26%', haut: '18%', retard: '6.2s', duree: '8.5s', opacite: 0.4 },
];

export function Ciel() {
  return (
    <div className="ciel" aria-hidden="true">
      {TRAITS.map((trait) => (
        <span
          key={`${trait.gauche}-${trait.haut}`}
          style={{
            left: trait.gauche,
            top: trait.haut,
            animationDelay: trait.retard,
            animationDuration: trait.duree,
            ['--opacite-trait' as string]: trait.opacite,
            filter: `opacity(${trait.opacite})`,
          }}
        />
      ))}
    </div>
  );
}
