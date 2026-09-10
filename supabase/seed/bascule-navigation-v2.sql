-- =====================================================================
-- Bascule de navigation vers le catalogue V2
--
-- A appliquer apres les lots de `supabase/seed/v3/`, jamais avant. C'est la
-- seule etape que les membres verront : elle publie les treize categories et
-- les 320 raccourcis importes, puis archive l'ancienne taxonomie.
--
-- Ce fichier vit hors du dossier genere : celui-ci est efface et reecrit a
-- chaque passage du generateur, et une bascule n'est pas une donnee du
-- classeur mais une decision d'exploitation.
--
-- Ce n'est pas non plus une migration : elle depend des donnees que les lots
-- viennent de poser. Une migration s'applique avant le seed et ne trouverait
-- rien a basculer.
--
-- Retour arriere : republier les anciennes categories et remettre les treize
-- en brouillon. Rien n'est supprime, les raccourcis gardent leur identifiant,
-- donc les favoris, l'historique et les copies des membres.
--   update public.categories set status = 'draft' where external_ref is not null;
--   update public.categories set status = 'published' where external_ref is null and parent_id is null;
-- =====================================================================

-- ---------------------------------------------------------------------
-- Refus de basculer sur un catalogue partiel
--
-- La production affiche aujourd'hui deux puces vides, heritees d'un import
-- laisse a moitie. On ne recommence pas : si le compte n'y est pas, rien ne
-- bouge.
-- ---------------------------------------------------------------------

do $$
declare
  v_prompts integer;
  v_categories integer;
  v_questions integer;
  v_sans_version integer;
begin
  select count(*) into v_prompts from public.prompts where catalog_version = 'v2.1';
  -- Les familles V5 arrivent par migration, invisibles : elles ne font pas
  -- partie des treize familles que cette bascule doit trouver.
  select count(*) into v_categories from public.categories
  where external_ref is not null and external_ref not like '%-V5-%';
  select count(*) into v_questions from public.prompt_questions;

  select count(*) into v_sans_version
  from public.prompts p
  where p.catalog_version = 'v2.1'
    and not exists (
      select 1 from public.prompt_variants v
      join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
      where v.prompt_id = p.id
    );

  if v_prompts <> 320 then
    raise exception 'Bascule refusee : % raccourcis importes au lieu de 320.', v_prompts;
  end if;
  if v_categories <> 13 then
    raise exception 'Bascule refusee : % categories au lieu de 13.', v_categories;
  end if;
  if v_questions <> 594 then
    raise exception 'Bascule refusee : % questions au lieu de 594.', v_questions;
  end if;
  if v_sans_version > 0 then
    raise exception 'Bascule refusee : % raccourcis ne seraient pas copiables.', v_sans_version;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Les cinq raccourcis offerts
--
-- Le classeur en propose seize ; la decision produit est d'en garder cinq,
-- ceux deja en ligne. On les fixe explicitement plutot que de laisser le
-- classeur decider : le palier d'essai est un arbitrage commercial, pas une
-- donnee editoriale.
-- ---------------------------------------------------------------------

-- Cadre au catalogue V2 : un raccourci hors catalogue garde le palier que
-- l'administration lui a donne. Sans cette clause, la bascule reprendrait la
-- main sur des decisions qui ne la regardent pas.
update public.prompts
set is_free = (command::text in (
  '/explodeview', '/packshot', '/headshot', '/rewriteclear', '/linkedinpost'
))
where catalog_version = 'v2.1';

-- ---------------------------------------------------------------------
-- Publication
-- ---------------------------------------------------------------------

-- `is_visible` est derivee du statut par declencheur : publier suffit.
--
-- Bornee aux treize familles de la V2 : les familles V5, posees par
-- migration et volontairement invisibles tant qu'elles sont vides, portent
-- elles aussi une reference externe. Sans cette borne, rejouer la bascule
-- publiait quatorze rayons deserts.
update public.categories
set status = 'published'::public.content_status
where external_ref is not null
  and external_ref not like '%-V5-%';

-- `published_at` n'est pose que la premiere fois : la date de mise en ligne
-- d'un raccourci deja publie ne doit pas etre reecrite.
update public.prompts
set status = 'published'::public.content_status,
    published_at = coalesce(published_at, now())
where catalog_version = 'v2.1';

-- ---------------------------------------------------------------------
-- L'ancienne taxonomie
--
-- Archivee, jamais supprimee : `legacy_category` et `legacy_subcategory`
-- gardent la trace de l'ancien rangement sur chaque raccourci, et une
-- categorie archivee peut etre republiee si la bascule doit etre annulee.
-- ---------------------------------------------------------------------

-- Une ancienne categorie n'est archivee que si plus aucun raccourci publie
-- ne s'y trouve. Archiver une categorie encore peuplee rendrait ses
-- raccourcis introuvables : mieux vaut la laisser et le voir.
update public.categories c
set status = 'archived'::public.content_status
where c.external_ref is null
  and not exists (
    select 1 from public.prompts p
    where p.category_id = c.id and p.status = 'published'
  );

-- ---------------------------------------------------------------------
-- Controle de sortie
-- ---------------------------------------------------------------------

do $$
declare
  v_vides integer;
  v_orphelins integer;
  v_offerts integer;
begin
  -- Une categorie visible sans raccourci est un cul-de-sac. La production en
  -- affiche deux aujourd'hui ; on n'en cree pas de nouvelles.
  select count(*) into v_vides
  from public.categories c
  where c.external_ref is not null
    -- Les familles V5 sont vides par construction jusqu'a leur lot : elles
    -- sont aussi invisibles, donc elles ne font de cul-de-sac pour personne.
    and c.external_ref not like '%-V5-%'
    and not exists (
      select 1 from public.prompts p
      where p.category_id = c.id and p.status = 'published'
    );
  if v_vides > 0 then
    raise exception '% categories V2 visibles sans aucun raccourci.', v_vides;
  end if;

  -- Chaque raccourci du catalogue V2 doit etre atteignable par une puce.
  select count(*) into v_orphelins
  from public.prompts p
  where p.catalog_version = 'v2.1'
    and p.status = 'published'
    and (p.category_id is null
         or not exists (select 1 from public.categories c
                        where c.id = p.category_id and c.is_visible));
  if v_orphelins > 0 then
    raise exception '% raccourcis V2 hors des categories visibles.', v_orphelins;
  end if;

  select count(*) into v_offerts from public.prompts
  where catalog_version = 'v2.1' and status = 'published' and is_free;
  if v_offerts <> 5 then
    raise exception '% raccourcis offerts au lieu de 5.', v_offerts;
  end if;

  raise notice 'Bascule effectuee : treize categories publiees, ancienne taxonomie archivee.';
end $$;
