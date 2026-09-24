'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Icone } from '@/components/ui/icone';
import { iconeDuRole } from '@/lib/ui/icones';

/**
 * Barre basse : cinq destinations, libelles toujours visibles.
 *
 * Accueil dit ce que RaccourcIA sait faire ; Decouvrir montre ce qu'il
 * produit ; Bibliotheque range ; Favoris garde ; Profil administre.
 *
 * « Decouvrir » se place au milieu, et pas au bout. C'est la page qu'on
 * vise le plus souvent apres l'Accueil, et le centre d'une barre a cinq est
 * l'endroit le plus court pour un pouce, quelle que soit la main.
 *
 * Cinq tient sur 360 px : chaque destination dispose de 72 px, soit bien
 * au-dela des 44 px de cible confortable. Les libelles restent — une barre
 * d'icones muettes se devine, elle ne se lit pas — et se resserrent d'un
 * pixel plutot que de disparaitre.
 *
 * LES ICONES VIENNENT DU KIT (decision de cadrage 9B) : 24 x 24, trait de
 * 2, extremites arrondies — le meme dessin partout. Favoris porte le coeur :
 * c'est le geste qui y range une commande, sur la carte comme sur la fiche.
 * Decouvrir garde sa boussole, que le kit n'a pas, tracee aux memes regles.
 */
/**
 * Une boussole pour Decouvrir : on n'y cherche pas, on regarde ce qui vient.
 * Absente du kit, elle est tracee a ses regles — 24 x 24, trait de 2.
 */
const BOUSSOLE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></svg>';

const ITEMS = [
  { href: '/app', label: 'Accueil', icon: iconeDuRole('home') },
  { href: '/app/bibliotheque', label: 'Bibliothèque', icon: iconeDuRole('library') },
  { href: '/app/decouvrir', label: 'Découvrir', icon: BOUSSOLE },
  { href: '/app/favoris', label: 'Favoris', icon: iconeDuRole('favorite') },
  { href: '/compte', label: 'Profil', icon: iconeDuRole('profile') },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const barre = useRef<HTMLElement>(null);

  // La barre suit le VIEWPORT VISIBLE, pas la page.
  //
  // `position: fixed` se repere sur le viewport de mise en page, qui ne bouge
  // pas quand la barre d'adresse du navigateur se retracte. Sur Android comme
  // sur iOS, la barre basse glisse alors sous la barre du navigateur : elle
  // disparait au defilement, puis revient — exactement ce qu'on nous a
  // signale. Le clavier logiciel produit le meme effet, en pire.
  //
  // `visualViewport` donne la seule mesure juste : ce que l'oeil voit. On
  // rattrape l'ecart par une translation, recalculee a chaque redimensionnement
  // et a chaque defilement du viewport visible.
  //
  // L'ecriture passe par le style de l'element et non par un etat React :
  // ce calcul se produit a chaque image d'un defilement, et un rendu React
  // par image rendrait la page saccadee.
  //
  // PAS DE SEUIL. On a essaye, et c'etait une erreur.
  //
  // Une bande vide etait apparue SOUS la barre pendant un appel telephonique,
  // et on en avait conclu que la correction se declenchait a tort. Un seuil
  // de cent pixels a donc ete pose : en dessous, la barre ne bougeait plus.
  //
  // Le defaut d'en face est immediatement revenu, et il est bien pire parce
  // qu'il arrive a chaque geste : en remontant la page, la barre d'adresse
  // du navigateur reapparait, le viewport visible perd sa hauteur, et la
  // barre basse — qui ne se corrigeait plus — descendait sous le bord de
  // l'ecran, tranchee en deux. C'est exactement le defaut que cette
  // correction existe pour empecher, et il fait cinquante pixels : sous le
  // seuil.
  //
  // Les deux ecarts ont la meme taille. Aucun seuil ne peut les distinguer,
  // et celui des deux qu'il faut rattraper est celui qui arrive tout le
  // temps. La correction repond donc de nouveau a n'importe quel ecart.
  //
  // CE QUI EST AJOUTE A LA PLACE : une ecoute du redimensionnement de la
  // FENETRE, en plus de celui du viewport visible. `window.innerHeight` peut
  // n'avoir pas encore ete remis a jour au moment ou le viewport visible
  // previent — on lit alors une hauteur perimee, et l'ecart calcule est
  // faux jusqu'au prochain evenement. C'est l'explication la plus probable
  // de la bande vide pendant l'appel : un seul evenement manquant, et la
  // valeur fausse restait. Avec les deux ecoutes, elle se corrige au
  // rafraichissement suivant.
  //
  // Cette explication reste une hypothese : elle n'a pas pu etre reproduite
  // ici, faute de telephone.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let attendu = 0;
    const placer = () => {
      cancelAnimationFrame(attendu);
      attendu = requestAnimationFrame(() => {
        const element = barre.current;
        if (!element) return;
        // Bas du viewport visible, exprime dans le repere de la page.
        const basVisible = vv.offsetTop + vv.height;
        const ecart = Math.max(0, window.innerHeight - basVisible);
        element.style.transform = ecart > 0 ? `translateY(-${ecart}px)` : '';
      });
    };

    placer();
    vv.addEventListener('resize', placer);
    vv.addEventListener('scroll', placer);
    window.addEventListener('resize', placer);
    return () => {
      cancelAnimationFrame(attendu);
      vv.removeEventListener('resize', placer);
      vv.removeEventListener('scroll', placer);
      window.removeEventListener('resize', placer);
    };
  }, []);

  return (
    <nav
      ref={barre}
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)] pb-[env(safe-area-inset-bottom)] will-change-transform"
    >
      <ul className="mx-auto flex max-w-screen-sm">
        {ITEMS.map((item) => {
          const active =
            item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`touch-target flex flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-center text-[10.5px] font-medium leading-tight ${
                  active ? 'text-[color:var(--color-brand)]' : 'text-[color:var(--color-muted)]'
                }`}
              >
                <Icone svg={item.icon} taille={24} />
                {/* Le libelle ne se coupe pas : « Bibliothèque » tient sur
                    une ligne a 10,5 px dans 72 px de large. */}
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
