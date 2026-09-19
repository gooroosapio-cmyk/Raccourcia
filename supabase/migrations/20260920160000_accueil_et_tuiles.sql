-- =====================================================================
-- Ce que l'accueil et la Bibliotheque montrent
--
-- Deux listes que le frontend ne doit pas fabriquer :
--
--   * les collections populaires, qui remplacent les categories sur
--     l'accueil. Une categorie est un tiroir ; une collection est une
--     intention de recherche, et c'est elle qu'on vient chercher.
--   * le visuel d'une tuile de tag. Un tag n'a pas d'image a lui tant que
--     l'administration ne lui en donne pas une ; en attendant, il emprunte
--     celle d'une de ses cartes.
--
-- « Au hasard » veut dire varie, pas clignotant. Le visuel est tire du
-- hachage de l'identifiant du tag : deux tags voisins montrent deux cartes
-- differentes, mais un tag montre toujours la meme d'un rechargement a
-- l'autre. Une tuile qui change d'image a chaque passage se lit comme une
-- panne, pas comme une decouverte.
--
-- `security invoker` : les deux lisent a travers les politiques du lecteur,
-- donc seulement le catalogue publie pour un visiteur. Aucune politique
-- n'est contournee ni assouplie.
--
-- Rejouable : `create or replace` seul.
-- =====================================================================

-- --- Les collections populaires ------------------------------------------
--
-- « Populaire » se mesure, il ne se decrete pas. Dans l'ordre : ce que
-- l'administration a epingle, ce qui est reellement montrable — une
-- collection sans un seul visuel ne se met pas en avant —, puis les likes
-- de ses commandes, puis son volume, puis l'ordre du catalogue.
--
-- Le volume ne vient qu'en quatrieme : trier d'abord par taille pousserait
-- toujours le plus gros rayon en tete, et l'accueil montrerait chaque jour
-- la meme chose.
create or replace function public.collections_populaires(p_limite integer default 10)
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
           -- Le visuel de la collection : celui de sa premiere commande qui
           -- en a un. Une collection sans visuel rend `null`, et la tuile
           -- se dessine alors en typographie plutot qu'en cadre vide.
           (select m.storage_path
            from public.prompts q
            join public.prompt_media m on m.prompt_id = q.id and m.kind = 'after'
            where q.category_id = c.id and q.status = 'published'
            order by q.is_pinned desc, q.sort_order, q.command, m.sort_order
            limit 1) as apercu
    from public.categories c
    join public.categories parent on parent.id = c.parent_id
    join public.prompts p on p.category_id = c.id and p.status = 'published'
    where c.is_visible and parent.is_visible
    group by c.id, c.slug, c.name, parent.name, c.sort_order
  ) s
  limit greatest(p_limite, 0);
$$;

comment on function public.collections_populaires(integer) is
  'Les collections mises en avant sur l''accueil, deja comptees et illustrees.';

-- --- Les tags, avec le visuel d'une de leurs cartes -----------------------
--
-- Remplace la version precedente : elle ne rendait que `image_path`, donc
-- une grille de tuiles vides tant que l'administration n'avait rien depose.
-- Le tag emprunte desormais le visuel d'une de ses cartes, ce qui donne une
-- grille qui ressemble a ce qu'il y a derriere.
create or replace function public.tags_explorables()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slug', slug,
        'nom', nom,
        'groupe', groupe,
        'image', image,
        'total', total)
      order by rang, total desc, nom),
    '[]'::jsonb)
  from (
    select t.slug,
           t.name as nom,
           t.groupe::text as groupe,
           -- Le visuel pose en administration prime toujours : c'est un
           -- choix, et un choix ne se fait pas doubler par un tirage.
           coalesce(
             t.image_path,
             (select m.storage_path
              from public.prompt_tags pt2
              join public.prompts q on q.id = pt2.prompt_id and q.status = 'published'
              join public.prompt_media m on m.prompt_id = q.id and m.kind = 'after'
              where pt2.tag_id = t.id
              -- Varie d'un tag a l'autre, stable pour un tag donne.
              order by hashtext(t.id::text || q.id::text), q.id
              limit 1)
           ) as image,
           count(*)::int as total,
           array_position(enum_range(null::public.tag_group), t.groupe) as rang
    from public.tags t
    join public.prompt_tags pt on pt.tag_id = t.id
    join public.prompts p on p.id = pt.prompt_id
    where t.is_active
      and p.status = 'published'
      and t.groupe not in ('bibliotheque', 'ia')
    group by t.id, t.slug, t.name, t.groupe, t.image_path
  ) s;
$$;

comment on function public.tags_explorables() is
  'Les tags portes par au moins une commande publiee, avec le visuel d''une de leurs cartes.';

do $rapport$
declare
  v_collections integer;
  v_tags integer;
begin
  select jsonb_array_length(public.collections_populaires(10)) into v_collections;
  select jsonb_array_length(public.tags_explorables()) into v_tags;
  raise notice 'Accueil : % collection(s) proposee(s), % tag(s) explorable(s).', v_collections, v_tags;
end $rapport$;
