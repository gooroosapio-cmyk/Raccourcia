-- =====================================================================
-- Les facettes de l'accueil, et le croisement de plusieurs tags
--
-- L'accueil remplace sa barre de recherche par un filtre depliant :
-- bibliotheque, categorie, tags, IA compatible. Ces quatre listes ne
-- peuvent pas etre ecrites dans le frontend — c'est la regle du projet — et
-- les composer cote application demanderait une lecture par facette, plus
-- une lecture de toutes les commandes pour les compter.
--
-- Deux fonctions, donc :
--   * `filtres_accueil` rend les quatre listes deja comptees, en un aller ;
--   * `prompts_avec_tous_les_tags` croise plusieurs tags, ce que PostgREST
--     ne sait pas faire (une jointure filtree donne un OU, jamais un ET).
--
-- `security invoker` : les deux lisent a travers les politiques du lecteur.
-- Un visiteur n'y voit donc que le catalogue publie, exactement comme
-- ailleurs. Aucune politique n'est contournee ni assouplie.
--
-- Rejouable : `create or replace` seul.
-- =====================================================================

-- --- Les quatre facettes ----------------------------------------------
--
-- Elles ne dependent que de la bibliotheque choisie, pas du reste de la
-- selection. Des listes qui se vident a mesure qu'on coche laissent devant
-- un panneau ou il ne reste rien a choisir, sans dire pourquoi ; ici, ce
-- qui est propose reste propose, et le compte annonce dit ce qu'il y a
-- derriere.
create or replace function public.filtres_accueil(
  p_library public.app_library default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_bibliotheques jsonb;
  v_familles jsonb;
  v_tags jsonb;
  v_ias jsonb;
begin
  -- Les bibliotheques ne sont pas filtrees par `p_library` : ce sont les
  -- onglets du filtre lui-meme, et en cacher un parce qu'il n'est pas
  -- choisi empecherait d'en changer.
  select coalesce(
    jsonb_agg(jsonb_build_object('valeur', valeur, 'total', total) order by rang),
    '[]'::jsonb)
  into v_bibliotheques
  from (
    select p.library::text as valeur,
           count(*)::int as total,
           array_position(enum_range(null::public.app_library), p.library) as rang
    from public.prompts p
    where p.status = 'published' and p.library is not null
    group by p.library
  ) b;

  -- La famille et non la collection : le catalogue en compte une
  -- cinquantaine, et cinquante puces en travers d'un telephone ne se
  -- choisissent pas. Une commande rangee dans une collection est comptee
  -- pour sa famille.
  select coalesce(
    jsonb_agg(jsonb_build_object('slug', slug, 'nom', nom, 'total', total)
              order by ordre, nom),
    '[]'::jsonb)
  into v_familles
  from (
    select f.slug, f.name as nom, f.sort_order as ordre, count(*)::int as total
    from public.prompts p
    join public.categories c on c.id = p.category_id
    join public.categories f on f.id = coalesce(c.parent_id, c.id)
    where p.status = 'published'
      and f.is_visible
      and (p_library is null or p.library = p_library)
    group by f.slug, f.name, f.sort_order
  ) s;

  -- Les groupes « bibliotheque » et « IA » sont ecartes : ce sont la
  -- premiere et la derniere facette du meme panneau, et proposer deux fois
  -- le meme choix a deux endroits donne un filtre qui se contredit
  -- lui-meme.
  --
  -- Vingt-quatre au plus, les plus portes d'abord. Un nuage de quatre-vingt
  -- dix-huit tags n'est pas un filtre, c'est une seconde bibliotheque.
  select coalesce(
    jsonb_agg(jsonb_build_object('slug', slug, 'nom', nom, 'groupe', groupe, 'total', total)
              order by total desc, nom),
    '[]'::jsonb)
  into v_tags
  from (
    select t.slug, t.name as nom, t.groupe::text as groupe, count(*)::int as total
    from public.prompt_tags pt
    join public.tags t on t.id = pt.tag_id
    join public.prompts p on p.id = pt.prompt_id
    where p.status = 'published'
      and t.is_active
      and t.groupe not in ('bibliotheque', 'ia')
      and (p_library is null or p.library = p_library)
    group by t.slug, t.name, t.groupe
    order by count(*) desc, t.name
    limit 24
  ) s;

  select coalesce(
    jsonb_agg(jsonb_build_object('cle', cle, 'nom', nom) order by ordre, nom),
    '[]'::jsonb)
  into v_ias
  from (
    select a.key as cle, a.name as nom, a.sort_order as ordre
    from public.ai_providers a
    where a.is_active
  ) s;

  return jsonb_build_object(
    'bibliotheques', v_bibliotheques,
    'familles', v_familles,
    'tags', v_tags,
    'ias', v_ias
  );
end;
$$;

comment on function public.filtres_accueil(public.app_library) is
  'Les quatre facettes du filtre depliant de l''accueil, deja comptees.';

-- --- Le croisement de plusieurs tags ----------------------------------
--
-- ET et non OU. Choisir « Portrait » puis « Studio » veut dire « les deux a
-- la fois » : un OU rendrait une liste plus longue a chaque tag coche,
-- c'est-a-dire l'inverse de ce qu'on attend d'un filtre.
--
-- L'intersection se fait ici, sur l'index inverse de `prompt_tags`, et non
-- en memoire apres avoir rapatrie toutes les associations.
--
-- La jointure sur `prompts` n'est pas decorative. `prompt_tags` se lit sans
-- restriction — c'est une table de liaison, et ses lignes ne disent rien
-- par elles-memes — mais la liste d'identifiants qui en sortirait, elle,
-- trahirait l'existence des brouillons.
--
-- Et le filtre sur `published` est explicite, en plus de la politique de
-- `prompts`. S'en remettre a la seule politique donnait deux reponses
-- differentes selon le lecteur : un administrateur, pour qui elle ne
-- s'applique pas, obtenait aussi les brouillons et les archives — donc un
-- croisement de tags qui ne correspondait plus aux comptes annonces a cote.
-- Cette fonction sert le catalogue public ; l'administration a ses propres
-- listes.
create or replace function public.prompts_avec_tous_les_tags(p_tags text[])
returns setof uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select pt.prompt_id
  from public.prompt_tags pt
  join public.tags t on t.id = pt.tag_id
  join public.prompts p on p.id = pt.prompt_id
  where t.slug = any (p_tags)
    and p.status = 'published'
  group by pt.prompt_id
  having count(distinct t.slug) = (
    select count(distinct valeur) from unnest(p_tags) as valeur
  );
$$;

comment on function public.prompts_avec_tous_les_tags(text[]) is
  'Les commandes qui portent tous les tags demandes, pas seulement l''un d''eux.';

do $rapport$
declare
  v_facettes jsonb;
begin
  select public.filtres_accueil() into v_facettes;
  raise notice 'Facettes : % bibliotheque(s), % famille(s), % tag(s), % IA.',
    jsonb_array_length(v_facettes -> 'bibliotheques'),
    jsonb_array_length(v_facettes -> 'familles'),
    jsonb_array_length(v_facettes -> 'tags'),
    jsonb_array_length(v_facettes -> 'ias');
end $rapport$;
