'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { OfferSheet } from '@/components/paywall/offer-sheet';
import type { Offre } from '@/components/paywall/upgrade-panel';

/** Delai avant ouverture spontanee, pour un visiteur sans acces. */
const DELAI_OUVERTURE_MS = 45_000;

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
 * L'ouverture spontanee n'a lieu qu'une fois par visite. Reproposer sans fin
 * transformerait la fenetre en harcelement, et ferait fuir un visiteur qui
 * n'a pas encore eu le temps de juger le catalogue.
 *
 * Fermer ramene toujours au catalogue, ou se trouvent les commandes
 * offertes : le visiteur n'est jamais laisse devant une page qu'il ne peut
 * pas utiliser.
 */
export function PaywallLayer({ hasAccess, offre }: { hasAccess: boolean; offre: Offre }) {
  const router = useRouter();
  const pathname = usePathname();

  const [ouverte, setOuverte] = useState(false);
  const dejaProposee = useRef(false);

  const open = useCallback(() => {
    if (hasAccess) return;
    dejaProposee.current = true;
    setOuverte(true);
  }, [hasAccess]);

  useEffect(() => {
    abonnes.add(open);
    return () => {
      abonnes.delete(open);
    };
  }, [open]);

  // Ouverture spontanee, une seule fois par visite.
  useEffect(() => {
    if (hasAccess || dejaProposee.current) return;
    const minuteur = setTimeout(open, DELAI_OUVERTURE_MS);
    return () => clearTimeout(minuteur);
  }, [hasAccess, open]);

  const close = useCallback(() => {
    setOuverte(false);
    // Retour aux commandes copiables : le catalogue les remonte en tete
    // pour un visiteur sans acces.
    if (pathname !== '/app') {
      router.push('/app');
      return;
    }
    // Le parametre a fait son office : le laisser rouvrirait la fenetre au
    // moindre retour arriere. Lu ici, hors rendu, il ne coute aucun Suspense.
    if (window.location.search.includes('offre=1')) router.replace('/app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
