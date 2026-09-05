'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'raccourcia.provider';
const EVENT = 'raccourcia:provider';

/**
 * Preference d'IA, dupliquee localement pour une reaction instantanee
 * (Blueprint Backend V1, 11.2).
 *
 * `useSyncExternalStore` est le bon outil ici : il lit une source externe au
 * rendu sans provoquer de rendu en cascade, et fournit une valeur serveur
 * distincte, donc pas de decalage d'hydratation.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function usePreferredProvider(fallback: string): [string, (next: string) => void] {
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) ?? fallback;
    } catch {
      // Navigation privee ou stockage bloque : la valeur par defaut suffit.
      return fallback;
    }
  }, [fallback]);

  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  const provider = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setProvider = useCallback((next: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sans consequence : le choix reste valable pour la vue courante.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [provider, setProvider];
}
