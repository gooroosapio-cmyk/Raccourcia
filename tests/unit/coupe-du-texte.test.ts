import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Une coupe de texte ne se pose jamais a cote d'une classe de `display`.
 *
 * POURQUOI CE TEST EXISTE. `line-clamp-3` pose `display: -webkit-box` ;
 * `block` pose `display: block`. Les deux ont la meme specificite, donc c'est
 * l'ordre dans la feuille qui tranche — et dans la feuille produite, `block`
 * vient apres. Ecrire `line-clamp-3 block` revient donc a n'ecrire que
 * `block` : la coupe ne s'applique pas du tout.
 *
 * Ce n'est pas une subtilite theorique. Trois elements portaient les deux
 * classes, et cela se voyait en production : un mode pose en pleine largeur
 * dans le feed affichait onze lignes de description, et une carte de galerie
 * dont le titre faisait quatre lignes poussait son coeur et son bouton hors
 * du cadre, ou `overflow-hidden` les tranchait.
 *
 * Le defaut est invisible a la relecture — les deux classes se lisent comme
 * si elles se completaient — et invisible aux tests d'integration, qui ne
 * rendent aucune page. Il se rattrape donc ici, sur le texte des sources.
 */
const DISPLAY = new Set([
  'block',
  'inline-block',
  'inline',
  'flex',
  'inline-flex',
  'grid',
  'inline-grid',
  'contents',
  'hidden',
  'table',
  'flow-root',
]);

describe('les coupes de texte de l interface', () => {
  it('ne partagent jamais leur element avec une classe de display', () => {
    const fautes: string[] = [];

    for (const fichier of fichiersDInterface()) {
      const source = readFileSync(join(process.cwd(), fichier), 'utf8');

      for (const classes of listesDeClasses(source)) {
        const jetons = classes.split(/\s+/).filter(Boolean);
        if (!jetons.some((jeton) => jeton.startsWith('line-clamp-'))) continue;

        const conflit = jetons.filter((jeton) => DISPLAY.has(jeton));
        if (conflit.length > 0) fautes.push(`${fichier} — ${conflit.join(', ')}`);
      }
    }

    expect(fautes).toEqual([]);
  });
});

/**
 * Les valeurs de `className`, qu'elles soient une chaine ou un gabarit.
 *
 * Les gabarits gardent leurs `${...}` : ce qu'on y cherche sont des classes
 * ecrites en clair, et une expression ne peut pas produire `block` sans
 * l'ecrire quelque part.
 */
function listesDeClasses(source: string): string[] {
  const valeurs: string[] = [];
  const motif = /className=(?:"([^"]*)"|\{`([^`]*)`\})/gs;

  for (const trouve of source.matchAll(motif)) valeurs.push(trouve[1] ?? trouve[2] ?? '');
  return valeurs;
}

/** Tous les composants et toutes les pages. */
function fichiersDInterface(): string[] {
  const trouves: string[] = [];

  const parcourir = (dossier: string) => {
    for (const entree of readdirSync(join(process.cwd(), dossier), { withFileTypes: true })) {
      const chemin = `${dossier}/${entree.name}`;
      if (entree.isDirectory()) parcourir(chemin);
      else if (entree.name.endsWith('.tsx')) trouves.push(chemin);
    }
  };

  for (const racine of ['components', 'app']) parcourir(racine);
  return trouves.sort();
}
