-- =====================================================================
-- Des visuels qui tournent, et des tags qu'on epingle
--
-- DEUX MANQUES SUR LA MEME GRILLE.
--
-- Le premier : la Bibliotheque montre des cartes illustrees, et un tiers
-- d'entre elles n'a pas d'image. `tags.image_path` n'est rempli que pour
-- les tags dont l'administration a depose un visuel ; les collections
-- empruntent l'apercu de leur PREMIERE commande, toujours la meme. Une
-- grille ou un tiers des cadres est vide, et ou les deux autres tiers ne
-- changent jamais, se parcourt une fois.
--
-- Le second : un membre ne peut rien marquer. Il retrouve ses commandes
-- favorites, mais pas les rayons ou il revient chaque semaine — il les
-- recherche a nouveau a chaque visite.
--
-- CE QUE CETTE MIGRATION AJOUTE.
--
--   * `visuels_tournants(integer)` : pour chaque tag et chaque collection,
--     UN visuel tire parmi ceux de son dossier, selon une graine. La
--     graine vient de l'heure cote application : la grille change d'une
--     heure a l'autre sans que rien ne soit ecrit en base, et deux
--     lecteurs de la meme heure voient la meme chose — donc le rendu
--     reste partageable et le cache reste valable.
--
--   * `tag_favorites` : les tags epingles par un membre. Meme forme et
--     meme politique que `favorites`, qui fait deja cela pour les
--     commandes. Un membre ne lit et n'ecrit que ses propres lignes.
--
-- Les fonctions existantes ne sont pas touchees : `tags_explorables`,
-- `collections_populaires` et les deux `*_de_bibliotheque` gardent leur
-- signature. L'application superpose le tirage au visuel declare, et c'est
-- le visuel declare qui gagne — ce que l'administration a choisi n'est
-- jamais remplace par un tirage.
--
-- `security invoker` : lecture a travers les politiques du lecteur. Aucune
-- politique n'est contournee ni assouplie.
--
-- Rejouable : `create table if not exists`, `create or replace`, et les
-- politiques deposees avant d'etre reposees.
-- =====================================================================

-- --- Les visuels tournants ----------------------------------------------
--
-- Un seul passage pour toute la grille. La page rend jusqu'a cinquante
-- cartes ; cinquante requetes d'un visuel chacune seraient cinquante
-- allers-retours sur un reseau mobile.
--
-- `distinct on` avec un tri par `hashtext(...)` tire sans `random()` : le
-- resultat est reproductible pour une graine donnee, donc la fonction
-- reste `stable` et le meme rendu peut etre mis en cache.
create or replace function public.visuels_tournants(p_graine integer default 0)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with visuels_de_tags as (
    select distinct on (t.id)
           'tag:' || t.slug as cle,
           m.storage_path as chemin
    from public.tags t
    join public.prompt_tags pt on pt.tag_id = t.id
    join public.prompts p on p.id = pt.prompt_id and p.status = 'published'
    join public.prompt_media m on m.prompt_id = p.id and m.kind = 'after'
    where t.is_active
    order by t.id, hashtext(t.id::text || p.id::text || p_graine::text)
  ),
  visuels_de_collections as (
    select distinct on (c.id)
           'collection:' || c.slug as cle,
           m.storage_path as chemin
    from public.categories c
    join public.prompts p on p.category_id = c.id and p.status = 'published'
    join public.prompt_media m on m.prompt_id = p.id and m.kind = 'after'
    where c.is_visible
    order by c.id, hashtext(c.id::text || p.id::text || p_graine::text)
  )
  select coalesce(jsonb_object_agg(cle, chemin), '{}'::jsonb)
  from (
    select cle, chemin from visuels_de_tags
    union all
    select cle, chemin from visuels_de_collections
  ) tout
  where chemin is not null and chemin <> '';
$$;

comment on function public.visuels_tournants(integer) is
  'Un visuel tire par tag et par collection, reproductible pour une graine donnee.';

-- --- Les tags epingles ---------------------------------------------------
create table if not exists public.tag_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);

comment on table public.tag_favorites is
  'Les rayons qu''un membre epingle. Prives, comme les commandes favorites.';

-- La lecture se fait toujours « mes tags, les plus recents d'abord » : la
-- Bibliotheque les remonte en tete de grille.
create index if not exists tag_favorites_user_idx
  on public.tag_favorites (user_id, created_at desc);

alter table public.tag_favorites enable row level security;

-- Meme politique que `favorites` : un membre ne voit et n'ecrit que ses
-- propres lignes. Aucun acces anonyme — un visiteur n'a pas de rayon a lui.
drop policy if exists "tag_favorites_own_all" on public.tag_favorites;
create policy "tag_favorites_own_all" on public.tag_favorites
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

do $$
declare
  v_visuels integer;
begin
  select count(*) into v_visuels
  from jsonb_object_keys(public.visuels_tournants(0));

  raise notice 'Visuels tournants : % entree(s) illustrees.', v_visuels;
end $$;
