'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { OfferSheet } from '@/components/paywall/offer-sheet';
import type { Offre } from '@/components/paywall/upgrade-panel';

/**
 * Quand l'offre se propose d'elle-meme, pour un visiteur sans acces.
 *
 * DEUX RENDEZ-VOUS, PUIS PLUS RIEN. Une seule ouverture a quarante-cinq
 * secondes arrivait trop tot pour qui venait de commencer a regarder, et
 * ne revenait jamais pour qui restait vingt minutes.
 *
 * La premiere, a une minute, tombe apres une poignee de cartes : on a vu
 * de quoi il s'agit, la proposition a un sens. La seconde, a cinq minutes,
 * s'adresse a qui est reste — le seul signal d'interet dont on dispose.
 *
 * Il n'y en a pas de troisieme. Au-dela, ce n'est plus une proposition,
 * c'est du harcelement, et la reponse a une fenetre qui revient sans cesse
 * est de fermer l'onglet.
 */
const RENDEZ_VOUS_MS = [60_000, 300_000] as const;

/**
 * La demande d'ouverture passe par un emetteur de module, pas par un
 * contexte React.
 *
 * Un fournisseur de contexte devrait envelopper tout l'espace membre. Cette
 * enveloppe cliente fait envoyer la coquille avant que les pages aient fini
 * de rendre : le `redirect()` des espaces reserves devient alors une
 * redirection cliente au lieu d'un 307, et la garde ne tient plus sans
 * JavaScript.
 *
 * `PaywallLayer` est donc une feuille, posee a cote du contenu.
 */
const abonnes = new Set<() => void>();

/** Ouvre la fenetre d'offre depuis n'importe quel composant client. */
export function openPaywall() {
  for (const abonne of abonnes) abonne();
}

/** Conserve l'ergonomie d'un hook pour les composants qui l'utilisaient. */
export function usePaywall() {
  return { open: openPaywall };
}

/**
 * Fenetre d'offre des visiteurs sans acces a vie.
 *
 * Trois declencheurs : une copie refusee, l'arrivee sur le catalogue depuis
 * un espace reserve (`?offre=1`, pose par la redirection serveur et relaye
 * par `PaywallAutoOpen`), et le simple temps passe.
 *
 * L'ouverture spontanee a deux rendez-vous par visite — une minute, puis
 * cinq — et seulement sur le catalogue. Elle surgissait sur n'importe
 * quelle page, y compris au milieu d'une fiche qu'on etait en train de
 * lire : la seule chose qu'elle interrompait alors, c'etait l'argument de
 * vente lui-meme. Il n'y a pas de troisieme rendez-vous : reproposer sans
 * fin transformerait la fenetre en harcelement, et ferait fuir un visiteur
 * qui n'a pas encore eu le temps de juger le catalogue.
 *
 * Fermer ne deplace plus personne. La fenetre ramenait au catalogue a chaque
 * fermeture : un visiteur qui lisait une fiche depuis une minute voyait la
 * fenetre s'ouvrir seule, la fermait, et se retrouvait a l'accueil.
 * Il avait perdu sa place pour avoir refuse une offre qu'il n'avait pas
 * demandee — c'est-a-dire qu'on le punissait de lire.
 *
 * Le renvoi ne garde son sens que dans un cas : quand la fenetre s'est
 * ouverte parce qu'un espace reserve a renvoye ici (`?offre=1`). La page
 * derriere est alors vraiment inutilisable, et le catalogue est le bon
 * endroit ou reposer le visiteur.
 */
export function PaywallLayer({ hasAccess, offre }: { hasAccess: boolean; offre: Offre }) {
  const router = useRouter();
  const pathname = usePathname();

  const [ouverte, setOuverte] = useState(false);
  // Vrai quand la fenetre s'est ouverte parce qu'un espace reserve a renvoye
  // ici : c'est le seul cas ou la page derriere ne sert a rien.
  const renvoi = useRef(false);

  const open = useCallback(() => {
    if (hasAccess) return;
    renvoi.current = window.location.search.includes('offre=1');
    setOuverte(true);
  }, [hasAccess]);

  useEffect(() => {
    abonnes.add(open);
    return () => {
      abonnes.delete(open);
    };
  }, [open]);

  // Ouverture spontanee : deux rendez-vous par visite, sur le catalogue.
  //
  // Les minuteurs sont poses ensemble et comptent depuis l'arrivee, non
  // l'un apres l'autre : chaines, une fermeture rapide de la premiere
  // fenetre aurait decale la seconde de tout le temps passe a la fermer.
  useEffect(() => {
    if (hasAccess || pathname !== '/app') return;

    const minuteurs = RENDEZ_VOUS_MS.map((delai) =>
      // Les DEUX rendez-vous s'ouvrent, y compris apres une fermeture :
      // c'est tout l'objet du second. Le refus d'une proposition faite au
      // bout d'une minute ne dit pas grand-chose — on regardait a peine ;
      // celui d'une proposition faite au bout de cinq est une reponse, et
      // il n'y a pas de troisieme fenetre.
      setTimeout(open, delai),
    );

    return () => {
      for (const minuteur of minuteurs) clearTimeout(minuteur);
    };
  }, [hasAccess, open, pathname]);

  const close = useCallback(() => {
    setOuverte(false);

    // Le parametre a fait son office : le laisser rouvrirait la fenetre au
    // moindre retour arriere. Lu ici, hors rendu, il ne coute aucun Suspense.
    if (!renvoi.current) return;
    renvoi.current = false;
    if (pathname === '/app') {
      router.replace('/app');
      return;
    }
    // Renvoye d'un espace reserve : le catalogue est la seule page que le
    // visiteur peut reellement utiliser.
    router.push('/app');
  }, [pathname, router]);

  if (!ouverte) return null;
  return <OfferSheet offre={offre} onClose={close} />;
}

/**
 * Ouvre la fenetre a l'arrivee, quand la page l'a decide cote serveur.
 *
 * Monte uniquement par `/app` lorsque l'URL porte `?offre=1`, c'est-a-dire
 * apres un renvoi depuis un espace reserve. N'affiche rien par lui-meme.
 */
export function PaywallAutoOpen() {
  useEffect(() => {
    openPaywall();
  }, []);

  return null;
}
