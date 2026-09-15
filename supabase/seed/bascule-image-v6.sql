-- =====================================================================
-- Bascule du domaine Image : six familles deviennent trois.
--
-- La migration 20260913120000 a pose les trois familles, en brouillon.
-- Celle-ci les publie, deplace les commandes, archive ce qui se vide.
--
-- Tout tient dans une transaction : si un controle de sortie leve, rien ne
-- reste a moitie fait. Rejouable : au second passage, tout est deja en
-- place et plus rien ne bouge.
--
-- Rien n'est supprime. Les anciennes familles passent en archive et les
-- commandes orphelines aussi : leur adresse continue de repondre, leur
-- contenu reste lisible en administration, et un retour arriere est un
-- changement de statut. Les regles du produit l'exigent, et c'est de toute
-- facon la seule facon de defaire une erreur de regroupement.
-- =====================================================================

begin;

-- Une trace de l'etat d'avant, pour pouvoir dire ce qui a bouge et le
-- defaire si le regroupement ne convient pas.
create table if not exists public.prompts_avant_image_v6 as
select p.id, p.command, p.category_id, p.status, c.external_ref as famille_ref
from public.prompts p
left join public.categories c on c.id = p.category_id
where p.mode = 'image';

-- La sauvegarde ne s'expose pas au navigateur.
--
-- `alter default privileges` (migration 20260905110000) donne a toute table
-- creee ici un SELECT pour `anon` et une ecriture pour `authenticated`.
-- C'est le bon defaut pour le catalogue, qui referme ensuite par RLS ; une
-- sauvegarde, elle, n'a pas de policy et ne refermerait rien. Elle porte le
-- rangement d'avant et permet le retour arriere : la laisser ouverte, c'est
-- laisser n'importe quel compte connecte la vider.
alter table public.prompts_avant_image_v6 enable row level security;
revoke all on table public.prompts_avant_image_v6 from anon, authenticated;


-- --- Garde : les trois familles doivent exister ------------------------

do $garde$
declare
  v_n integer;
begin
  select count(*) into v_n from public.categories
  where external_ref in ('IMG-V6-01', 'IMG-V6-02', 'IMG-V6-03');
  if v_n <> 3 then
    raise exception 'Bascule image : % familles V6 sur 3. Appliquer d abord la migration.', v_n;
  end if;
end $garde$;

-- --- Publication des trois familles ------------------------------------

update public.categories
set status = 'published'::public.content_status
where external_ref in ('IMG-V6-01', 'IMG-V6-02', 'IMG-V6-03')
  and status <> 'published';

-- --- Deplacement des commandes -----------------------------------------
--
-- Les six familles V5 d'abord, puis les six familles V3 : la bascule V5
-- avait laisse derriere elle quelques commandes publiees dans l'ancien
-- rangement. Les reprendre ici plutot que les archiver evite de retirer du
-- catalogue une commande qu'un membre avait deja sous la main.
--
-- Le statut ne bouge pas : une commande en brouillon le reste, elle change
-- seulement de rayon.

update public.prompts p
set category_id = (select id from public.categories where external_ref = v.vers)
from (values
  ('IMG-V5-03', 'IMG-V6-01'),
  ('IMG-V5-05', 'IMG-V6-01'),
  ('IMG-V5-02', 'IMG-V6-02'),
  ('IMG-V5-01', 'IMG-V6-02'),
  ('IMG-V5-06', 'IMG-V6-03'),
  ('IMG-V5-04', 'IMG-V6-03'),
  ('IMG-03', 'IMG-V6-01'),
  ('IMG-04', 'IMG-V6-01'),
  ('IMG-06', 'IMG-V6-01'),
  ('IMG-02', 'IMG-V6-02'),
  ('IMG-01', 'IMG-V6-03'),
  ('IMG-05', 'IMG-V6-03')
) as v(depuis, vers)
where p.category_id = (select id from public.categories where external_ref = v.depuis)
  and p.status <> 'archived';

-- --- Les commandes orphelines ------------------------------------------
--
-- Ce qui reste en mode image hors des trois familles apres les deux
-- deplacements : une commande rangee dans une famille que le nouveau
-- decoupage ne reprend pas. Elle n'a plus de rayon et part en archive.
--
-- Bornee aux familles du catalogue, celles qui portent une reference
-- externe. Une categorie posee a la main — un jeu de recette, un essai en
-- administration — n'a pas ete rangee par une refonte et n'a pas a etre
-- videe par celle-ci.

update public.prompts p
set status = 'archived'::public.content_status
where p.mode = 'image'
  and p.status <> 'archived'
  and exists (
    select 1 from public.categories c
    where c.id = p.category_id
      and c.external_ref is not null
      and c.external_ref not in ('IMG-V6-01', 'IMG-V6-02', 'IMG-V6-03')
  );

-- --- Les familles vidées ------------------------------------------------

update public.categories c
set status = 'archived'::public.content_status
where c.mode = 'image'
  and c.status <> 'archived'
  and c.external_ref is not null
  and c.external_ref not in ('IMG-V6-01', 'IMG-V6-02', 'IMG-V6-03')
  and not exists (
    select 1 from public.prompts p
    where p.category_id = c.id and p.status <> 'archived'
  );

-- --- Controles de sortie -------------------------------------------------

do $ctrl$
declare
  v_familles integer;
  v_commandes integer;
  v_hors integer;
  v_restantes integer;
  v_archivees integer;
  v_ordre text;
begin
  select count(*) into v_familles
  from public.categories
  where mode = 'image' and is_visible and external_ref is not null;
  if v_familles <> 3 then
    raise exception 'Domaine image : % familles visibles au lieu de 3.', v_familles;
  end if;

  -- Aucune commande image active ne doit rester hors des trois familles.
  select count(*) into v_hors
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.mode = 'image' and p.status <> 'archived'
    and c.external_ref is not null
    and c.external_ref not in ('IMG-V6-01','IMG-V6-02','IMG-V6-03');
  if v_hors > 0 then
    raise exception 'Domaine image : % commandes actives hors des trois familles.', v_hors;
  end if;

  select count(*) into v_restantes
  from public.categories
  where mode = 'image' and status <> 'archived'
    and external_ref is not null
    and external_ref not in ('IMG-V6-01','IMG-V6-02','IMG-V6-03');
  if v_restantes > 0 then
    raise exception 'Domaine image : % anciennes familles encore actives.', v_restantes;
  end if;

  -- Rien ne doit avoir disparu : ce qui n'est plus actif est archive, et
  -- le compte d'avant se retrouve entierement dans le compte d'apres.
  select count(*) into v_commandes
  from public.prompts where mode = 'image' and status <> 'archived';
  select count(*) into v_archivees
  from public.prompts where mode = 'image' and status = 'archived';
  if v_commandes + v_archivees <> (select count(*) from public.prompts_avant_image_v6) then
    raise exception 'Domaine image : % actives + % archivees ne retrouvent pas les % d avant.',
      v_commandes, v_archivees, (select count(*) from public.prompts_avant_image_v6);
  end if;

  select string_agg(name, ' > ' order by sort_order) into v_ordre
  from public.categories
  where mode = 'image' and is_visible and external_ref is not null;

  raise notice 'Bascule image : % commandes actives dans trois familles — %.', v_commandes, v_ordre;
end $ctrl$;

commit;
