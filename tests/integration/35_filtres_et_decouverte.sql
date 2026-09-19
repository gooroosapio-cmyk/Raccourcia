-- =====================================================================
-- Le filtre de l'accueil et l'ordre de Decouvrir
--
-- Deux garanties qu'aucune interface ne peut offrir :
--
--   * plusieurs tags se croisent en ET. Un OU rendrait une liste plus longue
--     a chaque tag coche — l'inverse exact de ce qu'on attend d'un filtre, et
--     un defaut invisible tant qu'on ne coche qu'un tag a la fois.
--
--   * le rang de decouverte existe, il est stable, et il entremele les
--     rayons. Sans rang, la pagination au curseur repasse des cartes ou en
--     saute ; avec un rang qui suivrait l'ordre du catalogue, le feed
--     defilerait par familles de soixante.
--
-- Et deux bornes de lecture : ces fonctions lisent a travers les politiques
-- du lecteur, donc un visiteur n'y trouve que le catalogue publie.
-- =====================================================================
begin;

-- --- Les facettes decrivent ce qui existe -------------------------------
do $$
declare
  v_facettes jsonb;
  v_familles integer;
begin
  select public.filtres_accueil() into v_facettes;

  perform tests_assert(
    v_facettes ? 'bibliotheques' and v_facettes ? 'familles'
      and v_facettes ? 'tags' and v_facettes ? 'ias',
    'Les facettes de l''accueil ne portent pas les quatre groupes attendus.');

  perform tests_assert(
    jsonb_array_length(v_facettes -> 'bibliotheques') > 0,
    'Aucune bibliotheque n''est proposee alors que le catalogue en porte.');

  -- Le groupe « bibliotheque » ne doit pas revenir dans les tags : il
  -- repeterait la premiere facette, et le panneau proposerait deux fois le
  -- meme choix a deux endroits.
  perform tests_assert(
    not exists (
      select 1 from jsonb_array_elements(v_facettes -> 'tags') t
      where t ->> 'groupe' = 'bibliotheque'),
    'Un tag de bibliotheque est propose dans le groupe Tags.');

  -- Vingt-quatre au plus : un nuage de quatre-vingt-dix-huit tags n'est pas
  -- un filtre.
  perform tests_assert(
    jsonb_array_length(v_facettes -> 'tags') <= 24,
    'Le panneau propose plus de vingt-quatre tags.');

  -- Une bibliotheque restreint les familles proposees, sans quoi le panneau
  -- offrirait des rayons vides.
  select jsonb_array_length(public.filtres_accueil('images'::public.app_library) -> 'familles')
  into v_familles;

  perform tests_assert(
    v_familles > 0 and v_familles <= jsonb_array_length(v_facettes -> 'familles'),
    'Les familles ne suivent pas la bibliotheque choisie.');
end $$;

-- --- Les comptes annonces sont les vrais --------------------------------
do $$
declare
  v_slug text;
  v_annonce integer;
  v_reel integer;
begin
  select t ->> 'slug', (t ->> 'total')::int
  into v_slug, v_annonce
  from jsonb_array_elements(public.filtres_accueil() -> 'tags') t
  limit 1;

  if v_slug is null then return; end if;

  select count(*) into v_reel
  from public.prompt_tags pt
  join public.tags tg on tg.id = pt.tag_id
  join public.prompts p on p.id = pt.prompt_id
  where tg.slug = v_slug and p.status = 'published';

  perform tests_assert(
    v_annonce = v_reel,
    format('Le tag %s annonce %s commandes pour %s reelles.', v_slug, v_annonce, v_reel));
end $$;

-- --- Plusieurs tags se croisent en ET, jamais en OU ----------------------
do $$
declare
  v_a text;
  v_b text;
  v_seul_a integer;
  v_croise integer;
  v_attendu integer;
begin
  -- Deux tags reellement portes, choisis dans la base plutot qu'ecrits ici :
  -- un test qui nomme ses donnees casse a la premiere refonte de taxonomie.
  select tg.slug into v_a
  from public.prompt_tags pt
  join public.tags tg on tg.id = pt.tag_id
  group by tg.slug order by count(*) desc limit 1;

  select tg.slug into v_b
  from public.prompt_tags pt
  join public.tags tg on tg.id = pt.tag_id
  where tg.slug <> v_a
  group by tg.slug order by count(*) desc limit 1;

  if v_a is null or v_b is null then return; end if;

  select count(*) into v_seul_a
  from public.prompts_avec_tous_les_tags(array[v_a]);

  select count(*) into v_croise
  from public.prompts_avec_tous_les_tags(array[v_a, v_b]);

  select count(*) into v_attendu
  from public.prompt_tags pa
  join public.tags ta on ta.id = pa.tag_id and ta.slug = v_a
  join public.prompt_tags pb on pb.prompt_id = pa.prompt_id
  join public.tags tb on tb.id = pb.tag_id and tb.slug = v_b;

  perform tests_assert(
    v_croise = v_attendu,
    format('Le croisement de %s et %s rend %s commandes au lieu de %s.',
           v_a, v_b, v_croise, v_attendu));

  -- Un second tag ne peut jamais allonger la liste : c'est la signature
  -- d'un OU, et elle passerait inapercue tant qu'on ne coche qu'un tag.
  perform tests_assert(
    v_croise <= v_seul_a,
    'Ajouter un tag a allonge la liste : le croisement se fait en OU.');

  -- Un tag inconnu ne rend rien, et surtout pas tout le catalogue.
  perform tests_assert(
    (select count(*) from public.prompts_avec_tous_les_tags(array['tag-qui-n-existe-pas'])) = 0,
    'Un tag inconnu rend des commandes.');
end $$;

-- --- L'ordre de Decouvrir : present, stable, entremele -------------------
do $$
declare
  v_sans integer;
  v_avant integer;
  v_apres integer;
  v_id uuid;
  v_rayons integer;
  v_cartes integer;
begin
  select count(*) into v_sans
  from public.prompts where status = 'published' and discover_rank is null;
  if v_sans > 0 then
    raise exception 'Decouvrir : % commande(s) publiee(s) sans rang.', v_sans;
  end if;

  -- Stable : une modification sans rapport ne redistribue pas le feed, sans
  -- quoi un palier repasserait des cartes deja vues.
  select id, discover_rank into v_id, v_avant
  from public.prompts where status = 'published' limit 1;

  update public.prompts set updated_at = now() where id = v_id;
  select discover_rank into v_apres from public.prompts where id = v_id;

  perform tests_assert(
    v_avant = v_apres,
    'Le rang de decouverte a change sans que l''identifiant bouge.');

  -- Entremele : les huit premieres cartes ne doivent pas venir du meme
  -- rayon. Un feed trie par catalogue montrerait soixante portraits d'affilee.
  select count(distinct p.category_id), count(*)
  into v_rayons, v_cartes
  from (
    select p.category_id, p.id
    from public.prompts p
    where p.status = 'published'
      and exists (select 1 from public.prompt_media m
                  where m.prompt_id = p.id and m.kind = 'after')
    order by p.discover_rank, p.id
    limit 8
  ) p;

  -- Seulement si le catalogue local porte des visuels : les images ne sont
  -- pas dans le depot, et un test qui exige leur presence echouerait ici
  -- sans rien dire de la production.
  if v_cartes >= 8 then
    perform tests_assert(
      v_rayons >= 4,
      format('Les huit premieres cartes de Decouvrir viennent de %s rayon(s).', v_rayons));
  end if;
end $$;

-- --- Un visiteur ne voit que le catalogue publie -------------------------
--
-- `security invoker` : les deux fonctions lisent a travers les politiques du
-- lecteur. Un brouillon compte dans une facette, ou dont l'identifiant sort
-- du croisement de tags, existerait pour qui ne devrait pas le connaitre.
--
-- `prompt_tags` se lit sans restriction : c'est la jointure sur `prompts`
-- qui porte la borne, et c'est precisement ce que ce bloc verifie.
create temporary table essai_facette (prompt_id uuid, tag_slug text, publiees integer);
-- La table de relais appartient au proprietaire : le role visiteur doit
-- pouvoir la lire, sinon le test echoue sur son propre echafaudage.
grant select on essai_facette to anon;

do $$
declare
  v_prompt uuid;
  v_tag uuid;
  v_slug text;
begin
  select id, slug into v_tag, v_slug from public.tags where is_active limit 1;

  insert into public.prompts (command, slug, name, mode, short_description, status)
  values ('/essai-filtre-facette', 'essai-filtre-facette', 'Essai facette',
          'image', 'Essai', 'draft')
  returning id into v_prompt;

  insert into public.prompt_tags (prompt_id, tag_id) values (v_prompt, v_tag);

  insert into essai_facette
  select v_prompt, v_slug, count(*)
  from public.prompt_tags pt
  join public.prompts p on p.id = pt.prompt_id
  where pt.tag_id = v_tag and p.status = 'published';
end $$;

-- Le changement de role se fait hors du bloc : `set local role` pose depuis
-- une fonction ne survit pas toujours a sa sortie, et un test qui resterait
-- proprietaire des tables ne verifierait aucune politique.
select tests_logout();

do $$
declare
  v_prompt uuid;
  v_slug text;
  v_publiees integer;
  v_annonce integer;
begin
  select prompt_id, tag_slug, publiees into v_prompt, v_slug, v_publiees
  from essai_facette;

  perform tests_assert(
    (select count(*) from public.prompts_avec_tous_les_tags(array[v_slug]) as trouve
     where trouve = v_prompt) = 0,
    'Une commande en brouillon remonte dans le croisement de tags pour un visiteur.');

  select (t ->> 'total')::int into v_annonce
  from jsonb_array_elements(public.filtres_accueil() -> 'tags') t
  where t ->> 'slug' = v_slug;

  perform tests_assert(
    v_annonce is null or v_annonce = v_publiees,
    format('Le tag %s annonce %s commandes a un visiteur pour %s publiees.',
           v_slug, v_annonce, v_publiees));
end $$;

reset role;

rollback;
