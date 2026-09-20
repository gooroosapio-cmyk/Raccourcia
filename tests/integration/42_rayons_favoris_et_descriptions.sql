-- =====================================================================
-- Les collections epinglees, et la description des rayons
--
-- DEUX PROMESSES.
--
--   * `category_favorites` tient la meme que `tag_favorites` : un membre
--     ne lit et n'ecrit que ses propres lignes. Une politique qui
--     oublierait `user_id` rendrait la bibliotheque privee de chacun
--     lisible par tous, et c'est exactement ce qu'on ne peut pas
--     verifier depuis l'interface.
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

-- --- Les collections epinglees restent privees ---------------------------
do $$
declare v_categorie uuid;
begin
  select id into v_categorie from public.categories where is_visible limit 1;
  if v_categorie is null then
    raise notice 'Aucune categorie visible : rien a epingler.';
    return;
  end if;

  insert into public.category_favorites (user_id, category_id)
  values ('00000000-0000-0000-0000-0000000000a1', v_categorie);

  perform set_config('tests.categorie', v_categorie::text, true);
end $$;

select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');
do $$
begin
  perform tests_assert(
    (select count(*) from public.category_favorites) = 1,
    'Un membre ne retrouve pas la collection qu''il a epinglee.');
end $$;
reset role;

select tests_login('00000000-0000-0000-0000-0000000000a2',
                   '00000000-0000-0000-0000-0000000000f2');
do $$
declare v_categorie uuid := current_setting('tests.categorie', true)::uuid;
begin
  perform tests_assert(
    (select count(*) from public.category_favorites) = 0,
    'Un membre voit les collections epinglees par quelqu''un d''autre.');

  begin
    insert into public.category_favorites (user_id, category_id)
    values ('00000000-0000-0000-0000-0000000000a1', v_categorie);
    perform tests_assert(false, 'Un membre a epingle une collection au nom d''un autre.');
  exception
    when insufficient_privilege then null;
  end;

  raise notice 'Collections epinglees : chacun ne voit et n''ecrit que les siennes.';
end $$;
reset role;

rollback;
