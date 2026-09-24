-- =====================================================================
-- Lot menage-archives / 100 — suppression des archives, paliers 1, 2 et 2 bis
--
-- Decide le 24 septembre 2026 sur le « Bilan des archives avant
-- suppression » (PDF du meme jour, § 4). Ce que le lot supprime n'est
-- relie a rien ; ce qui est relie a quelque chose reste.
--
-- PALIER 1 — sans effet visible :
--   * les variantes par IA archivees a l'etape 4 qu'aucune copie du journal
--     ne cite, avec leurs versions (1 620 variantes, 5 190 versions) ;
--   * les tags inactifs qui ne tiennent plus qu'a des commandes archivees
--     (107 tags, 3 901 liens) ;
--   * les tables de sauvegarde : schema `sauvegarde` et tables `*_avant_*`.
--     Le lot `retour-arriere-refonte` n'a plus rien a rendre apres ce lot.
-- PALIER 2 — les commandes archivees sans aucun lien : ni copie, ni
--   favori, ni recent, ni ancien lien, ni visuel (1 359 commandes), avec
--   leurs variantes, versions, champs, choix, tags et questions.
-- PALIER 2 BIS — regroupement : les commandes archivees qui restent sont
--   rangees dans un rayon archive par mode (« Commandes retirees »),
--   invisible ; les rayons et collections archives ou herites de la v2
--   qui se vident alors sont supprimes.
--
-- CE QUI N'EST JAMAIS TOUCHE : le journal des copies (ni ligne supprimee,
-- ni reference videe), les favoris, les recents, les anciens liens, les
-- comptes, les sessions, les acces a vie, les visuels. Le lot le verifie
-- en sortie et leve sinon : rien n'est alors ecrit.
--
-- BORNES. Le lot leve s'il trouve plus a supprimer que le bilan ne l'a
-- annonce. La base de repetition, qui n'a pas le volume de la production,
-- les leve par `raccourcia.menage_sans_borne = on`.
--
-- Rejouable : au second passage, tout est deja fait, rien n'est supprime
-- et rien ne leve.
-- =====================================================================
begin;

-- --- Etat de depart, pour les controles de sortie -----------------------
create temporary table menage_avant on commit drop as
select
  (select count(*) from public.copy_events) as copies,
  (select count(*) from public.copy_events where variant_id is not null) as copies_avec_variante,
  (select count(*) from public.copy_events where version_id is not null) as copies_avec_version,
  (select count(*) from public.favorites) as favoris,
  (select count(*) from public.recent_items) as recents,
  (select count(*) from public.prompt_aliases) as alias,
  (select count(*) from public.prompt_media) as visuels,
  (select count(*) from public.prompts where status = 'published') as publiees,
  (select count(*) from public.prompts where status = 'draft') as brouillons;

create temporary table menage_servie on commit drop as
select p.id as prompt_id, public.variante_servie(p.id, null) as variant_id
from public.prompts p
where p.status = 'published';

-- --- Ce qui part ----------------------------------------------------------
-- Palier 1 : variantes archivees d'une commande vivante, jamais citees.
create temporary table menage_variantes on commit drop as
select v.id
from public.prompt_variants v
join public.prompts p on p.id = v.prompt_id and p.status <> 'archived'
where v.status = 'archived'
  and not exists (select 1 from public.copy_events e where e.variant_id = v.id)
  and not exists (
    select 1 from public.copy_events e
    join public.prompt_versions pv on pv.id = e.version_id
    where pv.variant_id = v.id);

-- Palier 2 : commandes archivees reliees a rien.
create temporary table menage_commandes on commit drop as
select p.id
from public.prompts p
where p.status = 'archived'
  and not exists (select 1 from public.copy_events e where e.prompt_id = p.id)
  and not exists (select 1 from public.favorites f where f.prompt_id = p.id)
  and not exists (select 1 from public.recent_items r where r.prompt_id = p.id)
  and not exists (select 1 from public.prompt_aliases a
                  where a.alias_prompt_id = p.id or a.canonical_prompt_id = p.id)
  and not exists (select 1 from public.prompt_media m where m.prompt_id = p.id)
  and not exists (
    select 1 from public.copy_events e
    join public.prompt_variants v on v.id = e.variant_id
    where v.prompt_id = p.id)
  and not exists (
    select 1 from public.copy_events e
    join public.prompt_versions pv on pv.id = e.version_id
    join public.prompt_variants v on v.id = pv.variant_id
    where v.prompt_id = p.id);

-- Palier 1 : tags inactifs qu'aucune commande vivante ne porte.
create temporary table menage_tags on commit drop as
select t.id
from public.tags t
where not t.is_active
  and not exists (
    select 1 from public.prompt_tags pt
    join public.prompts p on p.id = pt.prompt_id and p.status <> 'archived'
    where pt.tag_id = t.id);

-- --- Bilan, annonce avant toute ecriture -----------------------------------
select
  (select count(*) from menage_variantes) as variantes_par_ia,
  (select count(*) from public.prompt_versions
     where variant_id in (select id from menage_variantes)) as leurs_versions,
  (select count(*) from menage_commandes) as commandes_archivees,
  (select count(*) from public.prompt_variants
     where prompt_id in (select id from menage_commandes)) as leurs_variantes,
  (select count(*) from public.prompt_versions pv
     join public.prompt_variants v on v.id = pv.variant_id
     where v.prompt_id in (select id from menage_commandes)) as leurs_versions_cmd,
  (select count(*) from public.prompt_fields
     where prompt_id in (select id from menage_commandes)) as leurs_champs,
  (select count(*) from public.prompt_tags
     where prompt_id in (select id from menage_commandes)) as leurs_tags,
  (select count(*) from public.prompt_questions
     where prompt_id in (select id from menage_commandes)) as leurs_questions,
  (select count(*) from menage_tags) as tags_inactifs,
  (select count(*) from public.prompt_tags
     where tag_id in (select id from menage_tags)) as liens_de_tags,
  (select count(*) from public.prompts
     where status = 'archived' and id not in (select id from menage_commandes)) as commandes_conservees;

do $bornes$
declare
  v_sans_borne boolean := coalesce(current_setting('raccourcia.menage_sans_borne', true), '') = 'on';
  v_variantes integer := (select count(*) from menage_variantes);
  v_commandes integer := (select count(*) from menage_commandes);
  v_tags integer := (select count(*) from menage_tags);
begin
  raise notice 'Bilan : % variante(s) par IA, % commande(s) archivee(s), % tag(s) inactif(s) a supprimer.',
    v_variantes, v_commandes, v_tags;
  if v_sans_borne then
    return;
  end if;
  if v_variantes > 1620 then
    raise exception 'Menage : % variantes a supprimer, le bilan en annoncait 1 620 au plus.', v_variantes;
  end if;
  if v_commandes > 1359 then
    raise exception 'Menage : % commandes a supprimer, le bilan en annoncait 1 359 au plus.', v_commandes;
  end if;
  if v_tags > 107 then
    raise exception 'Menage : % tags a supprimer, le bilan en annoncait 107 au plus.', v_tags;
  end if;
end $bornes$;

-- --- Paliers 1 et 2 : suppression -----------------------------------------
-- Les versions partent avec leur variante, les champs, choix, tags et
-- questions avec leur commande (cles etrangeres en cascade). Aucune de ces
-- lignes n'est citee par le journal : c'est la condition de selection.
delete from public.prompt_variants where id in (select id from menage_variantes);
delete from public.prompts where id in (select id from menage_commandes);
delete from public.tags where id in (select id from menage_tags);

-- --- Palier 2 bis : un rayon archive par mode, puis rangement --------------
insert into public.categories (parent_id, mode, slug, name, short_description, status, sort_order, external_ref)
select null, m.mode, 'commandes-retirees-' || m.mode::text,
       'Commandes retirées · ' || case m.mode::text
         when 'image' then 'Visuels' when 'texte' then 'Rédaction et Assistants' else 'Assistants' end,
       'Commandes sorties du catalogue, gardées pour leurs anciens liens et le journal des copies.',
       'archived', 9990, 'ARCHIVES-' || upper(m.mode::text)
from (select distinct mode from public.prompts where status = 'archived') m
on conflict (slug) do nothing;

update public.prompts p
   set category_id = c.id
  from public.categories c
 where p.status = 'archived'
   and c.slug = 'commandes-retirees-' || p.mode::text
   and p.category_id is distinct from c.id;

-- Les rayons et collections archives ou herites de la v2 qui ne rangent
-- plus rien. Les collections d'abord, les rayons ensuite : un rayon ne part
-- qu'une fois vide de toute collection.
create temporary table menage_categories on commit drop as
select c.id, c.parent_id
from public.categories c
where (c.status = 'archived' or c.external_ref ~ '^V2')
  and coalesce(c.external_ref, '') not like 'ARCHIVES-%'
  and not exists (select 1 from public.prompts p where p.category_id = c.id);

select count(*) filter (where parent_id is not null) as collections_supprimees,
       count(*) filter (where parent_id is null) as rayons_candidats
from menage_categories;

delete from public.categories c
 where c.id in (select id from menage_categories where parent_id is not null);
delete from public.categories c
 where c.id in (select id from menage_categories where parent_id is null)
   and not exists (select 1 from public.categories e where e.parent_id = c.id);

-- --- Palier 1 : les tables de sauvegarde ------------------------------------
drop table if exists sauvegarde.prompt_likes_20260924;
drop table if exists sauvegarde.prompts_like_count_20260924;
drop table if exists sauvegarde.tag_favorites_20260924;
drop table if exists sauvegarde.category_favorites_20260924;
drop table if exists sauvegarde.variantes_archivees_20260924;
do $schema$
begin
  -- `to_regnamespace` des deux cotes : un transtypage direct leverait au
  -- second passage, le schema n'existant plus.
  if to_regnamespace('sauvegarde') is not null
     and not exists (select 1 from pg_class where relnamespace = to_regnamespace('sauvegarde')) then
    drop schema sauvegarde;
  end if;
end $schema$;

drop table if exists public.categories_avant_v2;
drop table if exists public.prompt_questions_avant_v5;
drop table if exists public.prompts_avant_bascule_v5;
drop table if exists public.prompts_avant_image_v6;
drop table if exists public.prompts_avant_v2;
drop table if exists public.prompts_avant_v5;

-- --- Controles de sortie -------------------------------------------------------
do $ctrl$
declare
  a menage_avant%rowtype;
  v_changees integer;
  v_hors_rangement integer;
  v_orphelins integer;
begin
  select * into a from menage_avant;

  if (select count(*) from public.copy_events) <> a.copies
     or (select count(*) from public.copy_events where variant_id is not null) <> a.copies_avec_variante
     or (select count(*) from public.copy_events where version_id is not null) <> a.copies_avec_version then
    raise exception 'Menage : le journal des copies a change. Rien n''est ecrit.';
  end if;
  if (select count(*) from public.favorites) <> a.favoris
     or (select count(*) from public.recent_items) <> a.recents then
    raise exception 'Menage : des donnees de membres ont change. Rien n''est ecrit.';
  end if;
  if (select count(*) from public.prompt_aliases) <> a.alias then
    raise exception 'Menage : des anciens liens ont disparu. Rien n''est ecrit.';
  end if;
  if (select count(*) from public.prompt_media) <> a.visuels then
    raise exception 'Menage : des visuels ont disparu. Rien n''est ecrit.';
  end if;
  if (select count(*) from public.prompts where status = 'published') <> a.publiees
     or (select count(*) from public.prompts where status = 'draft') <> a.brouillons then
    raise exception 'Menage : des commandes publiees ou en brouillon ont change. Rien n''est ecrit.';
  end if;

  select count(*) into v_changees
  from menage_servie s
  where public.variante_servie(s.prompt_id, null) is distinct from s.variant_id;
  if v_changees > 0 then
    raise exception 'Menage : % commande(s) publiee(s) ne servent plus le meme texte.', v_changees;
  end if;
  if exists (select 1 from public.prompts where status = 'published' and not payload_ready) then
    raise exception 'Menage : une commande publiee n''a plus de texte a copier.';
  end if;

  select count(*) into v_hors_rangement
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.status = 'archived' and coalesce(c.external_ref, '') not like 'ARCHIVES-%';
  if v_hors_rangement > 0 then
    raise exception 'Menage : % commande(s) archivee(s) hors du rayon « Commandes retirees ».', v_hors_rangement;
  end if;

  select count(*) into v_orphelins
  from public.prompt_field_choices ch
  where not exists (select 1 from public.prompt_fields f where f.id = ch.field_id);
  if v_orphelins > 0 then
    raise exception 'Menage : % choix de champ orphelin(s).', v_orphelins;
  end if;
end $ctrl$;

-- Ce qui reste, pour le journal du workflow.
select
  (select count(*) from public.prompts where status = 'archived') as commandes_archivees_restantes,
  (select count(*) from public.prompt_variants where status = 'archived') as variantes_archivees_restantes,
  (select count(*) from public.tags where not is_active) as tags_inactifs_restants,
  (select count(*) from public.categories
     where (status = 'archived' or external_ref ~ '^V2')
       and coalesce(external_ref, '') not like 'ARCHIVES-%') as rayons_archives_ou_v2_restants,
  (select count(*) from public.copy_events) as copies_du_journal;

commit;
