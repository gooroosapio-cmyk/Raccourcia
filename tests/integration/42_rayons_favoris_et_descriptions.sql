-- =====================================================================
-- Les collections epinglees, et la description des rayons
--
-- Les collections epinglees ont ete retirees le 24 septembre 2026
-- (decision 5A) ; voir 48_retrait_jaime_et_rayons_epingles.sql.
--
-- CE QUI RESTE A PROMETTRE :
--
--   * les quatre fonctions de sommaire rendent desormais une cle
--     `description`. Elles ont ete remplacees par `create or replace`
--     alors qu'elles tournaient deja : ce test verifie qu'aucune n'a
--     perdu ce qu'elle rendait avant — le slug, le nom, le total et
--     l'apercu — en gagnant la nouvelle cle.
-- =====================================================================
begin;

-- --- Les sommaires n'ont rien perdu -------------------------------------
do $$
declare
  v_entree jsonb;
  v_manquantes text;
begin
  -- Chaque entree doit porter toutes ses cles. Une cle disparue ne se
  -- verrait qu'a l'ecran, sous la forme d'une carte sans nom.
  select string_agg(cle, ', ') into v_manquantes
  from unnest(array['slug', 'nom', 'groupe', 'image', 'description', 'total']) as cle
  where not exists (
    select 1
    from jsonb_array_elements(public.tags_explorables()) as e
    where e ? cle
  )
  and jsonb_array_length(public.tags_explorables()) > 0;

  if v_manquantes is not null then
    raise exception 'tags_explorables ne rend plus : %', v_manquantes;
  end if;

  select string_agg(cle, ', ') into v_manquantes
  from unnest(array['slug', 'nom', 'famille', 'description', 'total', 'apercu']) as cle
  where not exists (
    select 1
    from jsonb_array_elements(public.collections_populaires(50)) as e
    where e ? cle
  )
  and jsonb_array_length(public.collections_populaires(50)) > 0;

  if v_manquantes is not null then
    raise exception 'collections_populaires ne rend plus : %', v_manquantes;
  end if;

  -- Les deux fonctions bornees a une bibliotheque, memes cles.
  if jsonb_array_length(public.tags_de_bibliotheque('images')) > 0
     and not (public.tags_de_bibliotheque('images') -> 0 ? 'description') then
    raise exception 'tags_de_bibliotheque ne rend pas la description.';
  end if;

  if jsonb_array_length(public.collections_de_bibliotheque('images')) > 0
     and not (public.collections_de_bibliotheque('images') -> 0 ? 'description') then
    raise exception 'collections_de_bibliotheque ne rend pas la description.';
  end if;

  raise notice 'Sommaires : toutes les cles rendues, description comprise.';
end $$;

-- --- Une description vide ne devient pas une chaine vide -----------------
--
-- L'ecran choisit entre la phrase du rayon et son compteur. Une chaine
-- vide est « vraie » cote JavaScript : elle ferait disparaitre le compteur
-- sans rien mettre a la place.
do $$
declare v_vides integer;
begin
  select count(*) into v_vides
  from jsonb_array_elements(public.tags_explorables()) as e
  where e ->> 'description' = '';

  if v_vides > 0 then
    raise exception '% tag(s) rendent une description vide au lieu de null.', v_vides;
  end if;
end $$;

rollback;
