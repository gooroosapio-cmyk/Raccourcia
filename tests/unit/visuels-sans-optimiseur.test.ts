import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import nextConfig from '@/next.config';

/**
 * Les visuels du catalogue ne passent par aucun compteur exterieur.
 *
 * POURQUOI CE TEST EXISTE. Le stockage rend deja chaque visuel a la largeur
 * utile (`lib/media/url.ts`). L'optimiseur de l'hebergeur, lui, a un quota
 * mensuel : epuise, il repond « Payment Required » et l'image ne s'affiche
 * plus du tout.
 *
 * La regle etait posee appel par appel, par une propriete `unoptimized`
 * recopiee a la main. Quatre appels l'avaient, sept ne l'avaient pas — et
 * ces sept-la ont fini noirs en production : les tuiles de collection de
 * l'accueil, les trois visuels de Decouvrir et la mosaique de la
 * Bibliotheque. Rien ne le signalait, parce que la galerie, elle,
 * s'affichait.
 *
 * Le test verrouille donc les deux faces de la correction : le reglage
 * global existe, et personne ne revient a la regle recopiee — une
 * propriete `unoptimized` reapparue voudrait dire que le reglage global a
 * cesse d'etre cru.
 */
describe('les visuels ne dependent pas de l optimiseur de l hebergeur', () => {
  it('coupe l optimiseur pour toute l application', () => {
    expect(nextConfig.images?.unoptimized).toBe(true);
  });

  it('garde la liste des hotes autorises, pour le jour ou on le rallumerait', () => {
    const hotes = nextConfig.images?.remotePatterns ?? [];
    // Vide en test, faute de `NEXT_PUBLIC_SUPABASE_URL` : ce qui se verifie
    // ici, c'est que la cle n'a pas ete supprimee avec l'optimiseur.
    expect(Array.isArray(hotes)).toBe(true);
  });

  it('ne laisse aucune propriete `unoptimized` recopiee dans un composant', () => {
    const restants = fichiersAvecImage().filter((fichier) =>
      /\bunoptimized\b/.test(readFileSync(join(process.cwd(), fichier), 'utf8')),
    );
    expect(restants).toEqual([]);
  });
});

/** Les fichiers de l'interface qui rendent une image. */
function fichiersAvecImage(): string[] {
  const racines = ['components', 'app'];
  const trouves: string[] = [];

  const parcourir = (dossier: string) => {
    for (const entree of readdirSync(join(process.cwd(), dossier), { withFileTypes: true })) {
      const chemin = `${dossier}/${entree.name}`;
      if (entree.isDirectory()) parcourir(chemin);
      else if (entree.name.endsWith('.tsx')) {
        if (readFileSync(join(process.cwd(), chemin), 'utf8').includes("from 'next/image'")) {
          trouves.push(chemin);
        }
      }
    }
  };

  for (const racine of racines) parcourir(racine);
  return trouves.sort();
}
