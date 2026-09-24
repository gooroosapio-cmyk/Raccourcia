-- =====================================================================
-- Retour arriere / 200 — restaurer les « j'aime » et les rayons epingles
--
-- Defait la migration 20260924120000 : recree les trois tables et le
-- compteur tels que les migrations d'origine les avaient poses (colonnes,
-- cles, index, declencheur, politiques, droits), puis les remplit depuis
-- le schema `sauvegarde`. Necessaire seulement si l'on redeploie le code
-- d'avant la refonte : celui-ci lit `like_count` et `prompt_likes`.
--
-- Rejouable : `if not exists`, `on conflict do nothing`, et le compteur est
-- recalcule depuis la table, jamais incremente a l'aveugle.
-- =====================================================================
begin;

-- Sans sauvegarde, la migration de retrait n'a pas tourne : les tables sont
-- encore la, et il n'y a rien a restaurer. Les instructions ci-dessous sont
-- alors sans effet (`if not exists`, remplissages conditionnels).
do $ctrl$
begin
  if to_regclass('sauvegarde.prompt_likes_20260924') is null then
    raise notice 'Retour arriere / 200 : aucune sauvegarde, la migration de retrait n''a pas tourne.';
  end if;
end $ctrl$;

-- --- Les « j'aime » (migration 20260919090000) ------------------------------
create table if not exists public.prompt_likes (
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prompt_id, user_id)
);
create index if not exists prompt_likes_user_idx on public.prompt_likes (user_id);

alter table public.prompts add column if not exists like_count integer not null default 0;

create or replace function public.prompt_likes_recompter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.prompts set like_count = like_count + 1 where id = new.prompt_id;
    return new;
  end if;
  update public.prompts set like_count = greatest(like_count - 1, 0) where id = old.prompt_id;
  return old;
end;
$$;

drop trigger if exists prompt_likes_recompter on public.prompt_likes;
create trigger prompt_likes_recompter
  after insert or delete on public.prompt_likes
  for each row execute function public.prompt_likes_recompter();

create index if not exists prompts_like_count_idx
  on public.prompts (like_count desc) where status = 'published';

alter table public.prompt_likes enable row level security;
drop policy if exists prompt_likes_lecture on public.prompt_likes;
create policy prompt_likes_lecture on public.prompt_likes for select using (true);
drop policy if exists prompt_likes_ecriture on public.prompt_likes;
create policy prompt_likes_ecriture on public.prompt_likes
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists prompt_likes_retrait on public.prompt_likes;
create policy prompt_likes_retrait on public.prompt_likes
  for delete using ((select auth.uid()) = user_id);

grant select on public.prompt_likes to anon, authenticated;
grant insert, delete on public.prompt_likes to authenticated;
grant select (like_count) on public.prompts to anon, authenticated;

-- Les lignes d'origine, sauf celles dont la commande ou le compte n'existe
-- plus : une cle etrangere les refuserait, et elles ne voudraient plus rien dire.
do $remplir$
begin
  if to_regclass('sauvegarde.prompt_likes_20260924') is null then return; end if;
  execute $sql$
    insert into public.prompt_likes (prompt_id, user_id, created_at)
    select s.prompt_id, s.user_id, s.created_at
    from sauvegarde.prompt_likes_20260924 s
    where exists (select 1 from public.prompts p where p.id = s.prompt_id)
      and exists (select 1 from auth.users u where u.id = s.user_id)
    on conflict (prompt_id, user_id) do nothing
  $sql$;
end $remplir$;

-- Le compteur suit la table, quelle que soit l'histoire des insertions.
update public.prompts p
   set like_count = coalesce(n.total, 0)
  from (select pr.id, count(l.prompt_id) as total
          from public.prompts pr
          left join public.prompt_likes l on l.prompt_id = pr.id
         group by pr.id) n
 where n.id = p.id and p.like_count is distinct from n.total;

-- --- Les tags epingles (migration 20260921140000) --------------------------
create table if not exists public.tag_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);
create index if not exists tag_favorites_user_idx
  on public.tag_favorites (user_id, created_at desc);
alter table public.tag_favorites enable row level security;
drop policy if exists "tag_favorites_own_all" on public.tag_favorites;
create policy "tag_favorites_own_all" on public.tag_favorites
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, delete on public.tag_favorites to authenticated;

do $remplir$
begin
  if to_regclass('sauvegarde.tag_favorites_20260924') is null then return; end if;
  execute $sql$
    insert into public.tag_favorites (user_id, tag_id, created_at)
    select s.user_id, s.tag_id, s.created_at
    from sauvegarde.tag_favorites_20260924 s
    where exists (select 1 from public.tags t where t.id = s.tag_id)
      and exists (select 1 from auth.users u where u.id = s.user_id)
    on conflict (user_id, tag_id) do nothing
  $sql$;
end $remplir$;

-- --- Les collections epinglees (migration 20260921160000) ------------------
create table if not exists public.category_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id)
);
create index if not exists category_favorites_user_idx
  on public.category_favorites (user_id, created_at desc);
alter table public.category_favorites enable row level security;
drop policy if exists "category_favorites_own_all" on public.category_favorites;
create policy "category_favorites_own_all" on public.category_favorites
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, delete on public.category_favorites to authenticated;

do $remplir$
begin
  if to_regclass('sauvegarde.category_favorites_20260924') is null then return; end if;
  execute $sql$
    insert into public.category_favorites (user_id, category_id, created_at)
    select s.user_id, s.category_id, s.created_at
    from sauvegarde.category_favorites_20260924 s
    where exists (select 1 from public.categories c where c.id = s.category_id)
      and exists (select 1 from auth.users u where u.id = s.user_id)
    on conflict (user_id, category_id) do nothing
  $sql$;
end $remplir$;

do $bilan$
begin
  raise notice 'Retour arriere / 200 : % « j''aime », % tag(s) epingle(s), % collection(s) epinglee(s).',
    (select count(*) from public.prompt_likes),
    (select count(*) from public.tag_favorites),
    (select count(*) from public.category_favorites);
end $bilan$;

commit;
