-- =====================================================================
-- Lot archiver-variantes-par-ia / 100 — les variantes par IA s'archivent
--
-- Decision de cadrage 6B : une variante neutre dans la structure existante,
-- l'historique des versions conserve ; les variantes redondantes archivees,
-- PUIS retirees apres validation. Ce lot fait la premiere moitie : il
-- archive, il ne supprime rien. Variantes et versions restent en base,
-- restaurables par un simple changement de statut.
--
-- PRECONDITION : le lot `payload-unique` a tourne. Le lot leve si une carte
-- V5 n'a pas sa variante universelle publiee avec un texte courant : lui
-- retirer ses variantes par IA la laisserait sans rien a copier.
--
-- CE QUI EST ARCHIVE : les variantes publiees d'une IA, sur une commande
-- qui porte une variante universelle publiee. Rien d'autre — une commande
-- archivee, jamais reconciliee (decision 7), garde ses variantes telles
-- quelles.
--
-- RETOUR ARRIERE EXACT. Avant d'archiver, le lot inscrit chaque variante
-- visee dans `sauvegarde.variantes_archivees_20260924` : le lot
-- `retour-arriere-refonte` republie ces variantes-la, et aucune autre.
--
-- Rejouable : une variante deja archivee n'est pas reecrite.
-- =====================================================================
begin;

do $ctrl$
declare v_sans integer;
begin
  select count(*) into v_sans
  from public.prompts p
  where p.catalog_version = 'v5'
    and not exists (
      select 1
      from public.prompt_variants v
      join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
      join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current and pv.status = 'published'
      where v.prompt_id = p.id and v.status = 'published' and coalesce(btrim(pv.payload), '') <> ''
    );
  if v_sans > 0 then
    raise exception 'Lot archiver-variantes-par-ia : % carte(s) V5 sans texte canonique. Lancer d''abord le lot payload-unique.', v_sans;
  end if;
end $ctrl$;

create temporary table a_archiver on commit drop as
select v.id as variant_id, v.prompt_id
from public.prompt_variants v
join public.ai_providers a on a.id = v.provider_id and a.key <> 'universel'
where v.status = 'published'
  and exists (
    select 1
    from public.prompt_variants u
    join public.ai_providers au on au.id = u.provider_id and au.key = 'universel'
    where u.prompt_id = v.prompt_id and u.status = 'published'
  );

-- La liste exacte, gardee pour le retour arriere. Le schema `sauvegarde`
-- est ferme aux clients (migration 20260924120000) ; il est cree ici s'il
-- n'existe pas encore, avec les memes restrictions.
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
create table if not exists sauvegarde.variantes_archivees_20260924 (
  variant_id uuid primary key,
  prompt_id uuid not null,
  archivee_le timestamptz not null default now()
);
alter table sauvegarde.variantes_archivees_20260924 enable row level security;
revoke all on sauvegarde.variantes_archivees_20260924 from public;
insert into sauvegarde.variantes_archivees_20260924 (variant_id, prompt_id)
select variant_id, prompt_id from a_archiver
on conflict (variant_id) do nothing;

-- Bilan avant ecriture.
select count(*) as variantes_a_archiver,
       count(distinct prompt_id) as commandes,
       (select count(*) from public.prompt_versions pv
          where pv.variant_id in (select variant_id from a_archiver)) as versions_conservees
from a_archiver;

update public.prompt_variants v
   set status = 'archived', updated_at = now()
  from a_archiver x
 where v.id = x.variant_id;

-- Aucune commande publiee ne doit perdre son texte : chacune sert encore
-- une variante, et c'est l'universelle quand elle existe.
do $ctrl$
declare v_muettes integer; v_non_universelles integer;
begin
  select count(*) into v_muettes
  from public.prompts p
  where p.status = 'published' and not p.payload_ready;
  if v_muettes > 0 then
    raise exception 'Lot archiver-variantes-par-ia : % commande(s) publiee(s) sans texte apres archivage.', v_muettes;
  end if;

  select count(*) into v_non_universelles
  from public.prompts p
  where p.catalog_version = 'v5'
    and public.variante_servie(p.id, null) is distinct from (
      select u.id from public.prompt_variants u
      join public.ai_providers au on au.id = u.provider_id and au.key = 'universel'
      where u.prompt_id = p.id);
  if v_non_universelles > 0 then
    raise exception 'Lot archiver-variantes-par-ia : % carte(s) ne servent pas leur texte canonique.', v_non_universelles;
  end if;
end $ctrl$;

select count(*) filter (where v.status = 'published') as variantes_publiees,
       count(*) filter (where v.status = 'archived') as variantes_archivees
from public.prompt_variants v;

commit;
