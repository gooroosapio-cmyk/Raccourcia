'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  const params = useSearchParams();
  const renvoye = params.get('offre') === '1';

  // Le renvoi depuis un espace reserve ouvre la fenetre des le premier rendu :
  // c'est un etat initial, pas un effet de bord a declencher apres coup.
  const [ouverte, setOuverte] = useState(() => !hasAccess && renvoye);
  const dejaProposee = useRef(!hasAccess && renvoye);

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
    if (renvoye) router.replace('/app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname, renvoye, router]);

  return (
    <PaywallContext.Provider value={{ open }}>
      {children}
      {ouverte ? <OfferSheet offre={offre} onClose={close} /> : null}
    </PaywallContext.Provider>
  );
}
