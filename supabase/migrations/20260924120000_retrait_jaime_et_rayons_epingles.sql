-- =====================================================================
-- Retrait des « j'aime » et des rayons epingles
--
-- Decisions de cadrage 4B et 5A (refonte UI, 23 septembre 2026). Le coeur
-- devient le favori prive d'une commande ; il n'y a plus de geste public,
-- ni de compteur, ni d'epingle posee sur un tag ou une collection.
--
-- CE QUI PART, CHIFFRE AU 24 SEPTEMBRE 2026 EN PRODUCTION :
--   * `prompt_likes`       29 lignes, un seul membre ;
--   * `prompts.like_count` 29 commandes a 1, toutes les autres a 0 ;
--   * `tag_favorites`       2 lignes, un seul membre ;
--   * `category_favorites`  0 ligne.
-- Le bilan reel est releve au moment de l'application et s'affiche avant
-- toute suppression (NOTICE).
--
-- CE QUI RESTE : `favorites`, les commandes mises en favori — c'est le
-- coeur. Aucun compte, aucune session, aucun acces a vie, aucune copie
-- n'est touche.
--
-- SAUVEGARDE D'ABORD. Les trois tables sont recopiees, avec les compteurs,
-- dans le schema `sauvegarde`, que ni `anon` ni `authenticated` ne
-- peuvent lire et que l'API n'expose pas. Une copie qui n'a pas le meme
-- nombre de lignes que sa source leve, et rien n'est supprime.
--
-- ORDRE D'APPLICATION : APRES le deploiement du code qui ne lit plus ces
-- tables. Applique avant, la version en ligne demanderait `like_count` a
-- une table qui ne l'a plus.
--
-- Rejouable : la sauvegarde ne se refait pas si elle existe, chaque
-- suppression est conditionnelle, et les fonctions sont redefinies a
-- l'identique.
-- =====================================================================

create schema if not exists sauvegarde;
revoke all on schema sauvegarde from public;
do $droits$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on schema sauvegarde from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on schema sauvegarde from authenticated';
  end if;
end $droits$;

comment on schema sauvegarde is
  'Copies prises avant une suppression. Jamais lue par l''application ; ni anon ni authenticated n''y ont acces.';

-- --- 1. Sauvegarde, puis bilan -------------------------------------------
do $sauvegarde$
declare
  v_source text;
  v_cible text;
  v_n_source bigint;
  v_n_cible bigint;
begin
  foreach v_source in array array['prompt_likes', 'tag_favorites', 'category_favorites'] loop
    v_cible := v_source || '_20260924';
    if to_regclass('public.' || v_source) is not null
       and to_regclass('sauvegarde.' || v_cible) is null then
      execute format('create table sauvegarde.%I as table public.%I', v_cible, v_source);
      execute format('select count(*) from public.%I', v_source) into v_n_source;
      execute format('select count(*) from sauvegarde.%I', v_cible) into v_n_cible;
      if v_n_source <> v_n_cible then
        raise exception 'Sauvegarde de % incomplete : % lignes copiees sur %.', v_source, v_n_cible, v_n_source;
      end if;
      raise notice 'Bilan : % ligne(s) de % sauvegardee(s) puis supprimee(s).', v_n_source, v_source;
    end if;
  end loop;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'prompts' and column_name = 'like_count')
     and to_regclass('sauvegarde.prompts_like_count_20260924') is null then
    create table sauvegarde.prompts_like_count_20260924 as
      select id as prompt_id, like_count from public.prompts where like_count <> 0;
    raise notice 'Bilan : compteur « j''aime » de % commande(s) sauvegarde puis supprime.',
      (select count(*) from sauvegarde.prompts_like_count_20260924);
  end if;
end $sauvegarde$;

-- Personne ne lit la sauvegarde depuis l'application : pas de politique,
-- donc aucune ligne visible meme si un droit etait accorde par erreur.
do $verrou$
declare v_table text;
begin
  for v_table in select tablename from pg_tables where schemaname = 'sauvegarde' loop
    execute format('alter table sauvegarde.%I enable row level security', v_table);
    execute format('revoke all on sauvegarde.%I from public', v_table);
  end loop;
end $verrou$;

-- --- 2. Les sommaires ne trient plus sur les « j'aime » -------------------
-- Memes cles rendues, meme ordre moins le critere retire.
create or replace function public.collections_de_bibliotheque(p_library text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slug', slug, 'nom', nom, 'famille', famille,
        'description', description, 'total', total, 'apercu', apercu)
      order by epingles desc, avec_visuel desc, total desc, ordre, nom),
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

create or replace function public.collections_populaires(p_limite integer default 10)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slug', slug, 'nom', nom, 'famille', famille,
        'description', description, 'total', total, 'apercu', apercu)
      order by epingles desc, avec_visuel desc, total desc, ordre, nom),
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
    order by epingles desc, avec_visuel desc, total desc, ordre, nom
    limit p_limite
  ) s;
$$;

-- Le bilan de suppression d'une commande ne compte plus de « j'aime ».
create or replace function public.admin_apercu_suppression_commande(p_prompt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_apercu jsonb;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'commande', p.command,
    'nom', p.name,
    'statut', p.status::text,
    'visuels', (select count(*) from public.prompt_media m where m.prompt_id = p.id),
    'variantes', (select count(*) from public.prompt_variants v where v.prompt_id = p.id),
    'versions', (
      select count(*) from public.prompt_variants v
      join public.prompt_versions pv on pv.variant_id = v.id
      where v.prompt_id = p.id),
    'favoris', (select count(*) from public.favorites f where f.prompt_id = p.id),
    'tags', (select count(*) from public.prompt_tags pt where pt.prompt_id = p.id),
    'champs', (select count(*) from public.prompt_fields pf where pf.prompt_id = p.id),
    -- Les anciens liens qui menent ici. `prompt_aliases` refuse la
    -- suppression de leur destination : sans ce compte, l'administration
    -- se heurterait a une erreur de cle etrangere sans savoir pourquoi.
    'liens_anciens', (
      select count(*) from public.prompt_aliases a where a.canonical_prompt_id = p.id)
  )
  into v_apercu
  from public.prompts p
  where p.id = p_prompt_id;

  if v_apercu is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_apercu;
end;
$$;

-- --- 3. Retrait ------------------------------------------------------------
-- Le declencheur part avec sa table ; la fonction qu'il appelait, apres.
drop table if exists public.prompt_likes;
drop function if exists public.prompt_likes_recompter();
drop index if exists public.prompts_like_count_idx;
alter table public.prompts drop column if exists like_count;

drop table if exists public.tag_favorites;
drop table if exists public.category_favorites;
