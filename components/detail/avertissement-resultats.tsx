/**
 * Rappel de fin de fiche.
 *
 * Il ferme la fiche plutot que de l'ouvrir : place en tete, il ferait douter
 * avant meme d'avoir lu ce que la commande fait. Le ton reste factuel — deux
 * phrases, gris clair, sans encadre ni pictogramme d'alerte. Une commande qui
 * s'annonce risquee ne se copie pas, et ce n'est pas ce qui est dit ici :
 * l'IA n'est pas un outil deterministe, le resultat se relit.
 *
 * Sans balise `role="alert"` : ce n'est pas une alerte, c'est une note de bas
 * de page. Un lecteur d'ecran l'annoncerait par-dessus la lecture en cours.
 */
export function AvertissementResultats({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[12px] leading-relaxed text-[color:var(--color-muted)]/80 ${className}`}>
      Les résultats varient selon l’IA utilisée et sa version. Une IA peut se tromper : relisez
      avant d’utiliser.
    </p>
  );
}
