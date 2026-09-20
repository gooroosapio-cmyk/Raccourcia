-- =====================================================================
-- Epingler une collection, et dire ce qu'un rayon contient
--
-- DEUX MANQUES SUR LA MEME GRILLE.
--
-- Le premier : l'etoile n'existait que sur les tags. La Bibliotheque
-- montre pourtant deux sortes de portes cote a cote — collections et
-- tags — et epingler l'une mais pas l'autre se lit comme un defaut, pas
-- comme un choix. `category_favorites` fait pour les collections ce que
-- `tag_favorites` fait deja pour les tags : meme forme, meme politique.
--
-- Le second : un rayon de Textes ne montre rien. Une carte de tag Images
-- emprunte le visuel d'une de ses commandes ; « Synthese de reunion » n'a
-- aucune image a emprunter, et sa carte se reduit a deux mots. Les quatre
-- fonctions de sommaire rendent donc desormais la DESCRIPTION du rayon,
-- que l'administration remplit — une phrase vaut mieux qu'un compteur
-- quand il n'y a pas d'image.
--
-- POURQUOI `create or replace` SUR DES FONCTIONS DEJA APPLIQUEES. Aucune
-- signature ne change : ni le nom, ni les parametres, ni le type rendu.
-- Une CLE s'ajoute dans le JSON, et une cle inconnue est ignoree par le
-- lecteur qui ne la connait pas encore. Le deploiement peut donc se faire
-- dans n'importe quel ordre sans qu'un ecran casse entre-temps.
--
-- `security invoker` partout : lecture a travers les politiques du
-- lecteur. Aucune politique n'est contournee ni assouplie.
--
-- Rejouable : `create table if not exists`, `create or replace`, et les
-- politiques deposees avant d'etre reposees.
-- =====================================================================

-- --- Les collections epinglees -------------------------------------------
create table if not exists public.category_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

comment on table public.category_favorites is
  'Les collections qu''un membre epingle. Privees, comme les tags favoris.';

create index if not exists category_favorites_user_idx
  on public.category_favorites (user_id, created_at desc);

alter table public.category_favorites enable row level security;

drop policy if exists "category_favorites_own_all" on public.category_favorites;
create policy "category_favorites_own_all" on public.category_favorites
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- --- Les sommaires rendent la description --------------------------------

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
        'description', description,
        'total', total)
      order by rang, total desc, nom),
    '[]'::jsonb)
  from (
    select t.slug,
           t.name as nom,
           t.groupe::text as groupe,
           t.image_path as image,
           nullif(btrim(coalesce(t.description, '')), '') as description,
           count(*)::int as total,
           array_position(enum_range(null::public.tag_group), t.groupe) as rang
    from public.tags t
    join public.prompt_tags pt on pt.tag_id = t.id
    join public.prompts p on p.id = pt.prompt_id
    where t.is_active
      and p.status = 'published'
      and t.groupe not in ('bibliotheque', 'ia')
    group by t.slug, t.name, t.groupe, t.image_path, t.description
  ) s;
$$;

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
        'image', image, 'description', description, 'total', total)
      order by total desc, nom),
    '[]'::jsonb)
  from (
    select t.slug,
           t.name as nom,
           t.groupe::text as groupe,
           nullif(btrim(coalesce(t.description, '')), '') as description,
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
    group by t.id, t.slug, t.name, t.groupe, t.description
  ) s;
$$;

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
        'description', description, 'total', total, 'apercu', apercu)
      order by epingles desc, avec_visuel desc, likes desc, total desc, ordre, nom),
    '[]'::jsonb)
  from (
    select c.slug,
           c.name as nom,
           parent.name as famille,
           nullif(btrim(coalesce(c.short_description, '')), '') as description,
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
    where c.is_visible and parent.is_visible
    group by c.id, c.slug, c.name, parent.name, c.short_description, c.sort_order
    order by epingles desc, avec_visuel desc, likes desc, total desc, ordre, nom
    limit p_limite
  ) s;
$$;

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
        'description', description, 'total', total, 'apercu', apercu)
      order by epingles desc, avec_visuel desc, likes desc, total desc, ordre, nom),
    '[]'::jsonb)
  from (
    select c.slug,
           c.name as nom,
           parent.name as famille,
           nullif(btrim(coalesce(c.short_description, '')), '') as description,
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
      and p.library::text = p_library
    group by c.id, c.slug, c.name, parent.name, c.short_description, c.sort_order
  ) s;
$$;

do $$
declare v_avec integer; v_total integer;
begin
  select count(*) filter (where entree ->> 'description' is not null), count(*)
  into v_avec, v_total
  from jsonb_array_elements(public.tags_explorables()) as entree;

  raise notice 'Rayons : % tag(s) sur % portent une description.', v_avec, v_total;
end $$;
