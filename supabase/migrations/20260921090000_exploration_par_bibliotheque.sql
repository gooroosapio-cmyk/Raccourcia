-- =====================================================================
-- Entrer par une bibliotheque, puis par ce qu'elle contient
--
-- La Bibliotheque s'ouvrait sur tout le catalogue a la fois : les tags de
-- toutes les bibliotheques melanges, et les rayons dessous. Choisir
-- « Images » menait a une liste filtree de mille cartes — utile pour qui
-- sait deja ce qu'il cherche, inutile pour qui vient se reperer.
--
-- Ces deux fonctions rendent le sommaire d'une bibliotheque : ses
-- collections et ses tags, deja comptes et deja illustres. Ce sont les
-- memes regles que sur l'accueil, bornees a une bibliotheque.
--
-- Pourquoi de NOUVELLES fonctions plutot qu'un parametre ajoute aux
-- anciennes : une migration appliquee ne se modifie pas, et
-- `collections_populaires(integer)` est deja en production. Ajouter un
-- second parametre en changerait la signature, donc le nom PostgREST, et
-- casserait l'accueil pendant le deploiement.
--
-- `security invoker` : lecture a travers les politiques du lecteur. Un
-- visiteur n'obtient que le catalogue publie. Aucune politique n'est
-- contournee ni assouplie.
--
-- Rejouable : `create or replace` seul.
-- =====================================================================

-- --- Les collections d'une bibliotheque ----------------------------------
--
-- Meme classement que sur l'accueil — epingle, montrable, aime, volumineux —
-- mais sans limite : c'est un sommaire, il doit etre complet. Une page qui
-- n'en montre que dix laisse croire qu'il n'y en a que dix.
create or replace function public.collections_de_bibliotheque(p_library text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slug', slug, 'nom', nom, 'famille', famille,
        'total', total, 'apercu', apercu)
      order by epingles desc, avec_visuel desc, likes desc, total desc, ordre, nom),
    '[]'::jsonb)
  from (
    select c.slug,
           c.name as nom,
           parent.name as famille,
           c.sort_order as ordre,
           count(*)::int as total,
           count(*) filter (where p.media_ready)::int as avec_visuel,
           count(*) filter (where p.is_pinned)::int as epingles,
           coalesce(sum(p.like_count), 0)::int as likes,
           (select m.storage_path
            from public.prompts q
            join public.prompt_media m on m.prompt_id = q.id and m.kind = 'after'
            where q.category_id = c.id and q.status = 'published'
            order by q.is_pinned desc, q.sort_order, q.command, m.sort_order
            limit 1) as apercu
    from public.categories c
    join public.categories parent on parent.id = c.parent_id
    join public.prompts p on p.category_id = c.id and p.status = 'published'
    where c.is_visible
      and parent.is_visible
      -- Une collection appartient a la bibliotheque de ses commandes. Elle
      -- n'a pas de colonne a elle : le rangement se decide carte par carte,
      -- et l'administration peut corriger une carte sans deplacer un rayon.
      and p.library::text = p_library
    group by c.id, c.slug, c.name, parent.name, c.sort_order
  ) s;
$$;

comment on function public.collections_de_bibliotheque(text) is
  'Le sommaire d''une bibliotheque : ses collections, comptees et illustrees.';

-- --- Les tags d'une bibliotheque -----------------------------------------
--
-- Les groupes « bibliotheque » et « ia » sont ecartes : le premier repete
-- la page ou l'on se trouve deja, le second est une compatibilite, pas un
-- sujet. Les proposer ici donnerait deux chemins pour une meme decision.
create or replace function public.tags_de_bibliotheque(p_library text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slug', slug, 'nom', nom, 'groupe', groupe,
        'image', image, 'total', total)
      order by total desc, nom),
    '[]'::jsonb)
  from (
    select t.slug,
           t.name as nom,
           t.groupe::text as groupe,
           coalesce(
             t.image_path,
             (select m.storage_path
              from public.prompt_tags pt2
              join public.prompts q on q.id = pt2.prompt_id and q.status = 'published'
              join public.prompt_media m on m.prompt_id = q.id and m.kind = 'after'
              where pt2.tag_id = t.id
                and q.library::text = p_library
              order by hashtext(t.id::text || q.id::text), q.id
              limit 1)
           ) as image,
           count(*)::int as total
    from public.tags t
    join public.prompt_tags pt on pt.tag_id = t.id
    join public.prompts p on p.id = pt.prompt_id
    where t.is_active
      and p.status = 'published'
      and p.library::text = p_library
      and t.groupe::text not in ('bibliotheque', 'ia')
    group by t.id, t.slug, t.name, t.groupe
  ) s;
$$;

comment on function public.tags_de_bibliotheque(text) is
  'Les tags portes par les commandes publiees d''une bibliotheque.';

do $$
declare
  v_images integer;
  v_textes integer;
  v_reflexions integer;
begin
  select jsonb_array_length(public.collections_de_bibliotheque('images')) into v_images;
  select jsonb_array_length(public.collections_de_bibliotheque('textes')) into v_textes;
  select jsonb_array_length(public.collections_de_bibliotheque('reflexions')) into v_reflexions;

  raise notice 'Sommaires : % collection(s) Images, % Textes, % Reflexions.',
    v_images, v_textes, v_reflexions;
end $$;
