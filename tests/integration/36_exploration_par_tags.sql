-- =====================================================================
-- L'exploration par tags, et les champs de personnalisation
--
-- Deux garanties que l'interface ne peut pas tenir seule :
--
--   * la grille d'entree de la Bibliotheque ne propose que des tags qui
--     menent quelque part, et les tags proposes pour resserrer sont comptes
--     sur le croisement, pas sur eux-memes. Une suggestion qui rend zero
--     resultat est une impasse deguisee en piste.
--
--   * un champ « liste » ne vaut que l'un de ses choix, trois champs au
--     plus par commande, et supprimer la commande n'en laisse aucun
--     orphelin. La borne vit dans la base, pas dans le formulaire.
--
-- Et la borne de lecture : ces fonctions passent par `prompts`, donc par
-- ses politiques. Un brouillon ne se compte nulle part.
-- =====================================================================
begin;

-- --- La grille ne propose que ce qui mene quelque part -------------------
do $$
declare
  v_tags jsonb;
  v_sans integer;
begin
  select public.tags_explorables() into v_tags;

  perform tests_assert(
    jsonb_array_length(v_tags) > 0,
    'Aucun tag explorable alors que le catalogue en porte.');

  -- Un tag a zero commande ne doit pas figurer : ce serait une tuile qui
  -- ouvre sur un rayon vide, en premiere page de la Bibliotheque.
  perform tests_assert(
    not exists (
      select 1 from jsonb_array_elements(v_tags) t where (t ->> 'total')::int = 0),
    'Un tag sans commande est propose a l''exploration.');

  -- Et ceux que la taxonomie porte sans qu'aucune commande ne les emploie
  -- sont bien absents, sinon le controle ci-dessus ne prouverait rien.
  select count(*) into v_sans
  from public.tags t
  where t.is_active
    and not exists (select 1 from public.prompt_tags pt where pt.tag_id = t.id);

  perform tests_assert(
    v_sans = 0 or jsonb_array_length(v_tags) < (select count(*) from public.tags where is_active),
    'Les tags sans commande ne sont pas ecartes.');
end $$;

-- --- Les comptes annonces sont ceux du croisement -------------------------
do $$
declare
  v_a text;
  v_voisin jsonb;
  v_annonce integer;
  v_reel integer;
begin
  select t ->> 'slug' into v_a
  from jsonb_array_elements(public.tags_explorables()) t
  order by (t ->> 'total')::int desc
  limit 1;

  select t into v_voisin
  from jsonb_array_elements(public.tags_voisins(array[v_a], 5)) t
  limit 1;

  if v_voisin is null then return; end if;

  v_annonce := (v_voisin ->> 'total')::int;

  select count(*) into v_reel
  from public.prompts_avec_tous_les_tags(array[v_a, v_voisin ->> 'slug']);

  perform tests_assert(
    v_annonce = v_reel,
    format('Le voisin %s annonce %s commandes pour %s au croisement avec %s.',
           v_voisin ->> 'slug', v_annonce, v_reel, v_a));

  -- Un voisin ne se propose jamais lui-meme : cocher deux fois le meme tag
  -- ne resserre rien et laisse la puce active a cote de la puce proposee.
  perform tests_assert(
    not exists (
      select 1 from jsonb_array_elements(public.tags_voisins(array[v_a], 20)) t
      where t ->> 'slug' = v_a),
    'Un tag deja choisi est propose pour resserrer.');

  -- Aucun voisin ne mene a zero : la suggestion doit tenir sa promesse.
  perform tests_assert(
    not exists (
      select 1 from jsonb_array_elements(public.tags_voisins(array[v_a], 20)) t
      where (t ->> 'total')::int = 0),
    'Un voisin propose ne rend aucune commande.');
end $$;

-- --- La borne qui protege l'adresse de la requete ------------------------
--
-- LA SONNETTE A SONNE, ET ON Y A REPONDU.
--
-- Elle surveillait le plus gros tag du catalogue, parce que le filtre
-- renvoyait une liste d'identifiants que l'application posait ensuite dans
-- l'adresse de sa requete — trente-huit caracteres chacun. Le catalogue
-- Visuels V3 a porte « photographie » au-dela de cinq cents commandes, et
-- la sonnette a leve, comme elle devait.
--
-- La reponse est celle qu'elle demandait : le filtre A UN TAG est passe en
-- SQL, par une jointure interne aliasee, et ne rapatrie plus rien. Surveiller
-- encore le plus gros tag n'aurait plus de sens — ce chemin ne construit
-- plus d'adresse.
--
-- Ce qui reste a surveiller, c'est le chemin qui construit encore une liste :
-- l'INTERSECTION de plusieurs tags, qu'une jointure ne sait pas exprimer
-- (elle rendrait un OU). Croiser deux tags ne peut que reduire, donc la borne
-- tient largement — mais elle tient pour une raison, et c'est celle-la qu'on
-- verrouille maintenant.
do $$
declare
  v_max integer;
  v_paire text;
begin
  select coalesce(max(n), 0), max(paire) into v_max, v_paire
  from (
    select a.slug || ' + ' || b.slug as paire, count(*) as n
    from public.tags a
    join public.prompt_tags pa on pa.tag_id = a.id
    join public.tags b on b.id > a.id
    join public.prompt_tags pb on pb.tag_id = b.id and pb.prompt_id = pa.prompt_id
    join public.prompts p on p.id = pa.prompt_id
    where a.is_active and b.is_active
      and p.status = 'published'
      and a.groupe not in ('bibliotheque', 'ia')
      and b.groupe not in ('bibliotheque', 'ia')
    group by 1
    order by count(*) desc
    limit 1
  ) s;

  perform tests_assert(
    v_max <= 300,
    format('Le croisement %s porte %s commandes : la liste d''identifiants ne '
           'tient plus dans une adresse. Passer l''intersection en SQL aussi.',
           v_paire, v_max));
end $$;

-- --- Trois champs au plus, et une liste ne vaut que ses choix -------------
do $$
declare
  v_prompt uuid;
  v_champ uuid;
begin
  -- Une commande qui ne porte encore aucun champ : depuis le catalogue de
  -- septembre 2026, la plupart en declarent un ou trois, et reprendre la
  -- premiere venue buterait sur l'unicite de la position.
  select id into v_prompt from public.prompts p
  where p.status = 'published'
    and not exists (select 1 from public.prompt_fields f where f.prompt_id = p.id)
  limit 1;

  insert into public.prompt_fields (prompt_id, cle, libelle, kind, requis, position)
  values (v_prompt, 'ton', 'Ton', 'liste', true, 1)
  returning id into v_champ;

  insert into public.prompt_field_choices (field_id, valeur, libelle, position)
  values (v_champ, 'formel', 'Formel', 1), (v_champ, 'direct', 'Direct', 2);

  perform tests_assert(
    (select count(*) from public.prompt_field_choices where field_id = v_champ) = 2,
    'Les choix d''un champ liste n''ont pas ete enregistres.');

  -- Deux fois la meme valeur n'en font pas deux : sans cette borne, le menu
  -- de la fiche afficherait deux lignes identiques.
  begin
    insert into public.prompt_field_choices (field_id, valeur, libelle)
    values (v_champ, 'formel', 'Formel bis');
    perform tests_assert(false, 'Un choix en double a ete accepte.');
  exception when unique_violation then null;
  end;

  -- Supprimer la commande emporte champs et choix : aucun orphelin.
  delete from public.prompts where id = v_prompt;

  perform tests_assert(
    not exists (select 1 from public.prompt_fields where id = v_champ)
      and not exists (select 1 from public.prompt_field_choices where field_id = v_champ),
    'Supprimer une commande laisse ses champs derriere elle.');
end $$;

-- --- Un visiteur ne compte que le publie ---------------------------------
create temporary table essai_exploration (prompt_id uuid, tag_slug text, total integer);
grant select on essai_exploration to anon;

do $$
declare
  v_prompt uuid;
  v_tag uuid;
  v_slug text;
begin
  select id, slug into v_tag, v_slug from public.tags where is_active limit 1;

  insert into public.prompts (command, slug, name, mode, short_description, status)
  values ('/essai-exploration', 'essai-exploration', 'Essai exploration',
          'image', 'Essai', 'draft')
  returning id into v_prompt;

  insert into public.prompt_tags (prompt_id, tag_id) values (v_prompt, v_tag);

  insert into essai_exploration
  select v_prompt, v_slug, count(*)
  from public.prompt_tags pt
  join public.prompts p on p.id = pt.prompt_id
  where pt.tag_id = v_tag and p.status = 'published';
end $$;

select tests_logout();

do $$
declare
  v_slug text;
  v_attendu integer;
  v_annonce integer;
begin
  select tag_slug, total into v_slug, v_attendu from essai_exploration;

  select (t ->> 'total')::int into v_annonce
  from jsonb_array_elements(public.tags_explorables()) t
  where t ->> 'slug' = v_slug;

  perform tests_assert(
    v_annonce is null or v_annonce = v_attendu,
    format('Le tag %s annonce %s commandes a un visiteur pour %s publiees.',
           v_slug, v_annonce, v_attendu));
end $$;

reset role;

rollback;
