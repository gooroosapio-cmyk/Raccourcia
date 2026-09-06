'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { OfferSheet } from '@/components/paywall/offer-sheet';
import type { Offre } from '@/components/paywall/upgrade-panel';

/** Delai avant ouverture spontanee, pour un visiteur sans acces. */
const DELAI_OUVERTURE_MS = 45_000;

const PaywallContext = createContext<{ open: () => void }>({ open: () => {} });

/** Ouvre la fenetre d'offre depuis n'importe quel composant client. */
export function usePaywall() {
  return useContext(PaywallContext);
}

/**
 * Pilote la fenetre d'offre pour les visiteurs sans acces a vie.
 *
 * Trois declencheurs : une copie refusee, l'arrivee sur le catalogue depuis
 * un espace reserve (`?offre=1`, pose par la redirection serveur), et le
 * simple temps passe.
 *
 * Ce composant ne lit pas les parametres d'URL. `useSearchParams` imposerait
 * une frontiere Suspense autour de toute la coquille membre, et Next enverrait
 * alors la reponse avant que les pages reservees aient decide de rediriger :
 * leur garde deviendrait une redirection cliente, sans effet sans JavaScript.
 * C'est la page `/app` qui lit le parametre et monte `PaywallAutoOpen`.
 *
 * L'ouverture spontanee n'a lieu qu'une fois par visite. Reproposer sans fin
 * transformerait la fenetre en harcelement, et ferait fuir un visiteur qui
 * n'a pas encore eu le temps de juger le catalogue.
 *
 * Fermer ramene toujours au catalogue, ou se trouvent les commandes
 * offertes : le visiteur n'est jamais laisse devant une page qu'il ne peut
 * pas utiliser.
 */
export function PaywallProvider({
  hasAccess,
  offre,
  children,
}: {
  hasAccess: boolean;
  offre: Offre;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [ouverte, setOuverte] = useState(false);
  const dejaProposee = useRef(false);

  const open = useCallback(() => {
    if (hasAccess) return;
    dejaProposee.current = true;
    setOuverte(true);
  }, [hasAccess]);

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

  return (
    <PaywallContext.Provider value={{ open }}>
      {children}
      {ouverte ? <OfferSheet offre={offre} onClose={close} /> : null}
    </PaywallContext.Provider>
  );
}

/**
 * Ouvre la fenetre a l'arrivee, quand la page l'a decide cote serveur.
 *
 * Monte uniquement par `/app` lorsque l'URL porte `?offre=1`, c'est-a-dire
 * apres un renvoi depuis un espace reserve. N'affiche rien par lui-meme.
 */
export function PaywallAutoOpen() {
  const { open } = usePaywall();

  useEffect(() => {
    open();
  }, [open]);

  return null;
}
