-- =====================================================================
-- Domaine Image : trois rayons deviennent quatre.
--
-- La migration 20260913170000 a pose « Architecture et lieux » en
-- brouillon et renomme « Techniques et lieux » en « Technique et
-- information ». Celle-ci ouvre le quatrieme rayon et lui rend les
-- commandes de lieux, d'architecture et d'interieur.
--
-- Elle sait d'ou vient chaque commande grace a `prompts_avant_image_v6`,
-- la sauvegarde posee par la bascule precedente : ce sont celles qui
-- etaient rangees dans « Lieux, architecture et interieur » (IMG-V5-04)
-- ou dans la famille V3 equivalente (IMG-05).
--
-- Tout tient dans une transaction, avec ses controles de sortie. Rien
-- n'est supprime, aucun statut ne change : une commande change de rayon,
-- c'est tout. Rejouable : au second passage plus rien ne bouge.
-- =====================================================================

begin;

-- --- Gardes -------------------------------------------------------------

do $garde$
declare
  v_n integer;
begin
  select count(*) into v_n from public.categories
  where external_ref in ('IMG-V6-01', 'IMG-V6-02', 'IMG-V6-03', 'IMG-V6-04');
  if v_n <> 4 then
    raise exception 'Bascule image : % familles V6 sur 4. Appliquer d abord les migrations.', v_n;
  end if;

  if not exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'prompts_avant_image_v6') then
    raise exception 'Bascule image : la sauvegarde prompts_avant_image_v6 manque. Appliquer d abord bascule-image-v6.sql.';
  end if;
end $garde$;

-- --- Ouverture du quatrieme rayon ---------------------------------------

update public.categories
set status = 'published'::public.content_status
where external_ref = 'IMG-V6-04'
  and status <> 'published';

-- --- Retour des lieux ----------------------------------------------------
--
-- Deux cas, et le meme resultat. Soit la commande est deja passee par la
-- bascule a trois rayons et se trouve dans « Technique et information » :
-- la sauvegarde dit d'ou elle venait. Soit elle est restee dans son ancien
-- rangement, et son rayon actuel le dit directement.

update public.prompts p
set category_id = (select id from public.categories where external_ref = 'IMG-V6-04')
where p.mode = 'image'
  and p.status <> 'archived'
  and (
    (
      p.category_id = (select id from public.categories where external_ref = 'IMG-V6-03')
      and exists (
        select 1 from public.prompts_avant_image_v6 s
        where s.id = p.id and s.famille_ref in ('IMG-V5-04', 'IMG-05')
      )
    )
    or p.category_id in (
      select id from public.categories where external_ref in ('IMG-V5-04', 'IMG-05')
    )
  );

-- --- Les familles vidées --------------------------------------------------

update public.categories c
set status = 'archived'::public.content_status
where c.mode = 'image'
  and c.status <> 'archived'
  and c.external_ref is not null
  and c.external_ref not in ('IMG-V6-01', 'IMG-V6-02', 'IMG-V6-03', 'IMG-V6-04')
  and not exists (
    select 1 from public.prompts p
    where p.category_id = c.id and p.status <> 'archived'
  );

-- --- Controles de sortie --------------------------------------------------

do $ctrl$
declare
  v_familles integer;
  v_hors integer;
  v_vides integer;
  v_ordre text;
  v_commandes integer;
  v_archivees integer;
begin
  select count(*) into v_familles
  from public.categories
  where mode = 'image' and is_visible and external_ref is not null;
  if v_familles <> 4 then
    raise exception 'Domaine image : % familles visibles au lieu de 4.', v_familles;
  end if;

  -- L'ordre porte une intention : on entre par le portrait, on finit par le
  -- lieu. Il ne se voit pas en base, il se voit a l'ecran — trop tard.
  select string_agg(name, ' > ' order by sort_order) into v_ordre
  from public.categories
  where mode = 'image' and is_visible and external_ref is not null;
  if v_ordre <> 'Portraits et effets visuels > Publicité et marques > '
                || 'Technique et information > Architecture et lieux' then
    raise exception 'Domaine image : ordre inattendu — %.', v_ordre;
  end if;

  select count(*) into v_hors
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.mode = 'image' and p.status <> 'archived'
    and c.external_ref is not null
    and c.external_ref not in ('IMG-V6-01','IMG-V6-02','IMG-V6-03','IMG-V6-04');
  if v_hors > 0 then
    raise exception 'Domaine image : % commandes actives hors des quatre familles.', v_hors;
  end if;

  -- Un rayon ouvert et desert est un cul-de-sac : c'est le risque propre a
  -- un decoupage plus fin, et le seul que ce dedoublement pouvait creer.
  select count(*) into v_vides
  from public.categories c
  where c.external_ref in ('IMG-V6-01','IMG-V6-02','IMG-V6-03','IMG-V6-04')
    and not exists (select 1 from public.prompts p
                    where p.category_id = c.id and p.status = 'published');
  if v_vides > 0 then
    raise exception 'Domaine image : % familles ouvertes sans aucune commande.', v_vides;
  end if;

  -- Rien ne doit avoir disparu.
  select count(*) into v_commandes
  from public.prompts where mode = 'image' and status <> 'archived';
  select count(*) into v_archivees
  from public.prompts where mode = 'image' and status = 'archived';
  if v_commandes + v_archivees <> (select count(*) from public.prompts_avant_image_v6) then
    raise exception 'Domaine image : % actives + % archivees ne retrouvent pas les % d avant.',
      v_commandes, v_archivees, (select count(*) from public.prompts_avant_image_v6);
  end if;

  raise notice 'Bascule image : % commandes actives dans quatre familles — %.', v_commandes, v_ordre;
end $ctrl$;

commit;
