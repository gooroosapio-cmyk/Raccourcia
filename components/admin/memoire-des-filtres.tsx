'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * La liste d'administration se souvient d'ou on en etait.
 *
 * LE TRAVAIL REEL, ET CE QUI LE CASSAIT. On filtre sur « Textes, sans
 * visuel », on descend a la page 7, on ouvre une carte, on la corrige, on
 * revient — et la liste repart de la page 1, sans filtre. Chaque carte
 * corrigee coutait donc de refaire les huit gestes qui menaient a elle.
 * Sur un catalogue de mille cinq cents entrees, c'est le geste le plus
 * repete de l'administration.
 *
 * CE QUI EST MEMORISE : l'adresse complete de la liste — filtres, tri,
 * page. Elle est deja dans l'URL, il n'y avait qu'a la retenir.
 *
 * OU, ET POURQUOI LA. `sessionStorage` et non `localStorage` : la memoire
 * dure le temps de l'onglet. C'est exactement ce qui a ete demande — les
 * filtres tiennent tant qu'on travaille, et repartent a zero quand on
 * revient sur le site plus tard. Un `localStorage` rouvrirait, trois jours
 * apres, une liste filtree qu'on ne se rappelle pas avoir posee.
 *
 * Rien de sensible n'y passe : ce sont des parametres d'URL publics,
 * lisibles dans la barre d'adresse. Aucun identifiant, aucun contenu.
 *
 * QUAND LA MEMOIRE NE S'APPLIQUE PAS. Seulement quand l'adresse demandee
 * est nue. Un lien partage, un signet, un retour arriere vers une liste
 * filtree portent deja leur etat : le restaurer par-dessus remplacerait ce
 * qu'on vient de demander par ce qu'on avait demande avant.
 *
 * ET SEULEMENT A L'ARRIVEE SUR LA PAGE. C'est le piege de ce genre de
 * memoire : decocher le dernier filtre rend l'adresse nue, et une
 * restauration qui se declencherait a ce moment-la reposerait aussitot les
 * filtres qu'on vient de retirer. Le geste deviendrait impossible a faire.
 * Une reference dit que la restauration a deja ete tentee ; elle se
 * reinitialise au montage, c'est-a-dire en revenant de la fiche d'edition,
 * qui est exactement le moment ou l'on veut retrouver sa liste.
 */
const CLE = 'admin.raccourcis.derniere-liste';

export function MemoireDesFiltres({ recherche }: { recherche: string }) {
  const router = useRouter();
  const restaurationTentee = useRef(false);

  useEffect(() => {
    let memoire: string | null = null;
    try {
      memoire = window.sessionStorage.getItem(CLE);
    } catch {
      // Navigation privee, stockage refuse : la liste s'affiche sans
      // memoire plutot que de tomber.
      return;
    }

    // Une adresse portant deja des parametres fait autorite.
    if (recherche !== '') {
      restaurationTentee.current = true;
      if (memoire !== recherche) {
        try {
          window.sessionStorage.setItem(CLE, recherche);
        } catch {
          /* rien a faire : la memoire est un confort, pas une fonction */
        }
      }
      return;
    }

    // Adresse nue. Si l'on vient d'arriver et qu'une liste est en memoire,
    // on y retourne. `replace` et non `push` — sans quoi le bouton Retour
    // ferait un aller-retour entre la liste nue et la liste restauree, sans
    // jamais sortir.
    if (restaurationTentee.current) {
      // Adresse nue APRES coup : l'utilisateur a decoche ses filtres. C'est
      // un choix, pas un oubli — on l'enregistre.
      try {
        window.sessionStorage.removeItem(CLE);
      } catch {
        /* rien a faire */
      }
      return;
    }
    restaurationTentee.current = true;

    if (memoire) router.replace(`/admin/raccourcis?${memoire}`, { scroll: false });
  }, [recherche, router]);

  return null;
}

/** Oublier la liste retenue. Appele par « Reinitialiser les filtres ». */
export function oublierLaListe(): void {
  try {
    window.sessionStorage.removeItem(CLE);
  } catch {
    /* rien a faire */
  }
}
