import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { CatalogUnavailableError } from '@/lib/catalog/errors';
import { LIBRARIES, type Library } from '@/lib/constants';

/**
 * Les quatre facettes du filtre de l'accueil.
 *
 * Elles viennent de la base, jamais d'une liste ecrite ici : ouvrir un rayon
 * ou poser un tag en administration le fait apparaitre dans le filtre sans
 * redeploiement. C'est la regle du projet, et c'est aussi la seule facon
 * d'annoncer des comptes justes.
 *
 * Une seule fonction de base pour les quatre : quatre requetes PostgREST
 * separees — dont une pour compter les commandes de chaque famille — en
 * feraient huit allers pour dessiner un panneau qu'on ouvre en un geste.
 */

export type FacetteBibliotheque = { valeur: Library; total: number };
export type FacetteFamille = { slug: string; nom: string; total: number };
export type FacetteTag = { slug: string; nom: string; groupe: string; total: number };
export type FacetteIa = { cle: string; nom: string };

export type FacettesAccueil = {
  bibliotheques: FacetteBibliotheque[];
  familles: FacetteFamille[];
  tags: FacetteTag[];
  ias: FacetteIa[];
};

const VIDE: FacettesAccueil = { bibliotheques: [], familles: [], tags: [], ias: [] };

/**
 * Les facettes, pour la bibliotheque choisie.
 *
 * `null` veut dire « les trois » : le panneau s'ouvre alors sur le catalogue
 * entier, ce qui est l'etat d'arrivee.
 *
 * Memoise par rendu : la page lit les facettes pour dessiner le panneau, et
 * la liste de resultats n'a pas a les redemander.
 */
export const getFacettes = cache(async (library: Library | null): Promise<FacettesAccueil> => {
  const supabase = await createClient();

  // `undefined` et non `null` : la fonction a une valeur par defaut, et lui
  // passer explicitement `null` reviendrait au meme resultat par un chemin
  // que le typage genere ne decrit pas.
  const { data, error } = await supabase.rpc('filtres_accueil', {
    p_library: library ?? undefined,
  });

  if (error) throw new CatalogUnavailableError(error);

  return lire(data);
});

/**
 * Ce que la base rend est du JSON : il est relu champ par champ plutot que
 * transtype d'un bloc. Une facette mal formee doit disparaitre du panneau,
 * pas faire tomber l'accueil.
 */
function lire(brut: unknown): FacettesAccueil {
  if (!brut || typeof brut !== 'object') return VIDE;
  const source = brut as Record<string, unknown>;

  return {
    bibliotheques: tableau(source.bibliotheques)
      .map((entree) => ({
        valeur: texte(entree.valeur) as Library,
        total: entier(entree.total),
      }))
      .filter((facette): facette is FacetteBibliotheque =>
        LIBRARIES.includes(facette.valeur as Library),
      ),
    familles: tableau(source.familles)
      .map((entree) => ({
        slug: texte(entree.slug),
        nom: texte(entree.nom),
        total: entier(entree.total),
      }))
      .filter((facette) => facette.slug !== '' && facette.nom !== ''),
    tags: tableau(source.tags)
      .map((entree) => ({
        slug: texte(entree.slug),
        nom: texte(entree.nom),
        groupe: texte(entree.groupe),
        total: entier(entree.total),
      }))
      .filter((facette) => facette.slug !== '' && facette.nom !== ''),
    ias: tableau(source.ias)
      .map((entree) => ({ cle: texte(entree.cle), nom: texte(entree.nom) }))
      .filter((facette) => facette.cle !== ''),
  };
}

function tableau(valeur: unknown): Record<string, unknown>[] {
  return Array.isArray(valeur)
    ? valeur.filter((entree): entree is Record<string, unknown> => Boolean(entree))
    : [];
}

function texte(valeur: unknown): string {
  return typeof valeur === 'string' ? valeur : '';
}

function entier(valeur: unknown): number {
  return typeof valeur === 'number' && Number.isFinite(valeur) ? Math.trunc(valeur) : 0;
}
