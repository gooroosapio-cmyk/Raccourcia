import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * Les rayons qu'un membre a epingles.
 *
 * Un favori de commande range UNE carte ; un tag epingle range une porte.
 * Ce sont deux gestes differents, et le second manquait : on retrouvait sa
 * commande preferee, jamais le rayon ou l'on revient chaque semaine.
 *
 * Rendu comme un ensemble de slugs : les pages s'en servent pour allumer
 * l'etoile et pour remonter les cartes concernees en tete de grille. Un
 * visiteur en obtient un ensemble vide — il n'a pas de rayon a lui, et la
 * politique de la table le refuserait de toute facon.
 *
 * Une panne rend un ensemble vide plutot qu'une erreur : la grille garde
 * son ordre par defaut, ce qui est une degradation lisible.
 */
export const getTagsFavoris = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  // Le filtre sur `user_id` double la politique RLS. Elle suffirait ; il
  // coute un index deja present et rend la requete lisible sans avoir a
  // ouvrir le fichier de politiques.
  const { data, error } = await supabase
    .from('tag_favorites')
    .select('tags(slug)')
    .eq('user_id', user.id);

  if (error || !Array.isArray(data)) return new Set();

  const slugs = new Set<string>();
  for (const ligne of data) {
    const tag = (ligne as { tags: { slug: string } | null }).tags;
    if (tag?.slug) slugs.add(tag.slug);
  }
  return slugs;
});

/**
 * Les collections qu'un membre a epinglees.
 *
 * Meme geste, meme promesse que pour les tags : la Bibliotheque montre
 * les deux sortes de portes cote a cote, et n'en rendre qu'une epinglable
 * se lit comme un defaut plutot que comme un choix.
 *
 * Rendu en slugs, comme pour les tags : c'est ce que les cartes portent.
 */
export const getCollectionsFavorites = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from('category_favorites')
    .select('categories(slug)')
    .eq('user_id', user.id);

  if (error || !Array.isArray(data)) return new Set();

  const slugs = new Set<string>();
  for (const ligne of data) {
    const categorie = (ligne as { categories: { slug: string } | null }).categories;
    if (categorie?.slug) slugs.add(categorie.slug);
  }
  return slugs;
});
