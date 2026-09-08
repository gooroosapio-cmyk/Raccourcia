/**
 * Pluie de fond de l'accueil.
 *
 * Douze gouttes, douze retards, douze positions : la repetition d'un motif
 * unique se verrait au bout de trois secondes. Les valeurs sont fixes et non
 * tirees au hasard — un tirage au rendu donnerait un serveur et un client
 * differents, et React signalerait l'ecart a l'hydratation.
 *
 * Toutes partent au-dessus du cadre et tombent droit : c'est le sens de la
 * pluie, et c'est aussi ce qui laisse le titre d'aplomb. Les vitesses
 * different assez pour qu'aucune paire ne tombe en cadence.
 *
 * Purement decoratif : `aria-hidden`, et le conteneur ne prend pas le doigt.
 */
const GOUTTES = [
  { gauche: '4%', retard: '0s', duree: '4.6s', opacite: 0.25 },
  { gauche: '12%', retard: '2.1s', duree: '6.2s', opacite: 0.16 },
  { gauche: '21%', retard: '0.8s', duree: '5.1s', opacite: 0.22 },
  { gauche: '29%', retard: '3.4s', duree: '7s', opacite: 0.13 },
  { gauche: '37%', retard: '1.5s', duree: '4.9s', opacite: 0.24 },
  { gauche: '46%', retard: '4.2s', duree: '6.6s', opacite: 0.14 },
  { gauche: '55%', retard: '0.4s', duree: '5.5s', opacite: 0.2 },
  { gauche: '63%', retard: '2.8s', duree: '4.4s', opacite: 0.18 },
  { gauche: '71%', retard: '1.1s', duree: '7.4s', opacite: 0.12 },
  { gauche: '80%', retard: '3.9s', duree: '5.8s', opacite: 0.23 },
  { gauche: '88%', retard: '1.9s', duree: '4.7s', opacite: 0.17 },
  { gauche: '95%', retard: '5.1s', duree: '6.9s', opacite: 0.19 },
];

export function Ciel() {
  return (
    <div className="ciel" aria-hidden="true">
      {GOUTTES.map((goutte) => (
        <span
          key={goutte.gauche}
          style={{
            left: goutte.gauche,
            top: 0,
            animationDelay: goutte.retard,
            animationDuration: goutte.duree,
            ['--opacite-trait' as string]: goutte.opacite,
          }}
        />
      ))}
    </div>
  );
}
