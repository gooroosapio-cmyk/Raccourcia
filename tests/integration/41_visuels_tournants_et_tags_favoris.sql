-- =====================================================================
-- Les visuels tournants, et les rayons epingles
--
-- CE QUE LE TIRAGE PROMET :
--
--   * il est REPRODUCTIBLE. Deux appels de suite avec la meme graine
--     rendent la meme chose — sinon la page rendue deux fois n'a pas les
--     memes images, aucun cache ne vaut plus rien, et un lien partage ne
--     montre pas ce que l'expediteur a vu ;
--   * il TOURNE. Un rayon qui a plusieurs commandes illustrees ne doit pas
--     montrer eternellement la premiere. Une fonction qui rendrait
--     toujours le meme visuel passerait le test de reproductibilite sans
--     rien resoudre, et c'est exactement le defaut qu'elle corrige ;
--   * il ne montre QUE des visuels du rayon annonce. Emprunter ailleurs
--     illustrerait « Portrait » avec une image de « Cuisine » ;
--   * il lit a travers les politiques du lecteur.
--
-- ET LES TAGS EPINGLES : un membre ne lit et n'ecrit que ses propres
-- lignes. C'est la meme promesse que `favorites` pour les commandes, et
-- elle se casse de la meme facon — une politique qui oublierait `user_id`
-- rendrait la bibliotheque privee de chacun lisible par tous.
--
-- Le jeu de donnees commun n'a aucun visuel : les assertions de tirage
-- n'auraient rien a mesurer. Ce fichier pose donc les siens, dans la
-- transaction qu'il annule a la fin.
-- =====================================================================
begin;

-- --- Un rayon a deux visuels ---------------------------------------------
do $$
declare v_tag uuid;
begin
  insert into public.tags (slug, name) values ('essai-tirage', 'Essai de tirage')
  returning id into v_tag;

  -- Les deux commandes publiees du jeu commun, chacune avec son visuel.
  insert into public.prompt_tags (prompt_id, tag_id)
  select p.id, v_tag from public.prompts p where p.status = 'published';

  insert into public.prompt_media (prompt_id, kind, storage_path)
  select p.id, 'after', 'essai/' || p.slug || '.webp'
  from public.prompts p where p.status = 'published';

  perform set_config('tests.tag_tirage', v_tag::text, true);
end $$;

-- --- Reproductible, et il tourne -----------------------------------------
do $$
declare
  v_un jsonb;
  v_deux jsonb;
  v_vus text[] := '{}';
  v_visuel text;
  v_graine integer;
begin
  v_un := public.visuels_tournants(0);
  v_deux := public.visuels_tournants(0);

  if jsonb_typeof(v_un) <> 'object' then
    raise exception 'Le tirage doit rendre un objet, meme vide.';
  end if;

  -- REPRODUCTIBLE. Le tri se fait sur `hashtext(... || graine)` : la meme
  -- graine doit donner le meme resultat, sans quoi la fonction ne peut pas
  -- etre `stable` et la page clignote au rechargement.
  if v_un <> v_deux then
    raise exception 'Deux appels avec la meme graine ne rendent pas la meme chose.';
  end if;

  if v_un -> 'tag:essai-tirage' is null then
    raise exception 'Un tag portant deux commandes illustrees n''a recu aucun visuel.';
  end if;

  -- IL TOURNE. Douze heures d'affilee sur un rayon qui a deux visuels : on
  -- doit en voir deux. Une seule valeur signifierait que la graine
  -- n'entre pas dans le tri.
  for v_graine in 0..11 loop
    v_visuel := public.visuels_tournants(v_graine) ->> 'tag:essai-tirage';
    if not (v_visuel = any (v_vus)) then
      v_vus := v_vus || v_visuel;
    end if;
  end loop;

  if array_length(v_vus, 1) < 2 then
    raise exception 'Le tirage rend toujours le meme visuel : rien ne tourne.';
  end if;

  raise notice 'Tirage : % visuel(s) differents sur douze graines.', array_length(v_vus, 1);
end $$;

-- --- Chaque visuel vient bien de son rayon -------------------------------
do $$
declare v_faux integer;
begin
  select count(*) into v_faux
  from jsonb_each_text(public.visuels_tournants(3)) as tirage
  where tirage.key like 'tag:%'
    and not exists (
      select 1
      from public.tags t
      join public.prompt_tags pt on pt.tag_id = t.id
      join public.prompts p on p.id = pt.prompt_id and p.status = 'published'
      join public.prompt_media m on m.prompt_id = p.id and m.kind = 'after'
      where t.slug = substring(tirage.key from 5)
        and m.storage_path = tirage.value
    );

  if v_faux > 0 then
    raise exception '% tag(s) recoivent un visuel qui n''est pas du leur.', v_faux;
  end if;

  select count(*) into v_faux
  from jsonb_each_text(public.visuels_tournants(3)) as tirage
  where tirage.key like 'collection:%'
    and not exists (
      select 1
      from public.categories c
      join public.prompts p on p.category_id = c.id and p.status = 'published'
      join public.prompt_media m on m.prompt_id = p.id and m.kind = 'after'
      where c.slug = substring(tirage.key from 12)
        and m.storage_path = tirage.value
    );

  if v_faux > 0 then
    raise exception '% collection(s) recoivent un visuel qui n''est pas du leur.', v_faux;
  end if;

  -- Un brouillon n'illustre rien : ce serait montrer en vitrine une
  -- commande que personne ne peut ouvrir.
  select count(*) into v_faux
  from jsonb_each_text(public.visuels_tournants(3)) as tirage
  join public.prompt_media m on m.storage_path = tirage.value
  join public.prompts p on p.id = m.prompt_id
  where p.status <> 'published';

  if v_faux > 0 then
    raise exception '% visuel(s) tires d''une commande non publiee.', v_faux;
  end if;
end $$;

-- --- Le tirage lit avec les droits du lecteur ----------------------------
--
-- `security invoker`. Verifie en changeant de role : en tant que
-- proprietaire des tables la RLS ne s'applique pas, et le test ne
-- prouverait rien.
select tests_logout();
do $$
declare v_apres integer;
begin
  select count(*) into v_apres from jsonb_object_keys(public.visuels_tournants(0));
  perform set_config('tests.anon', v_apres::text, true);
end $$;
reset role;

do $$
declare
  v_avant integer;
  v_apres integer := current_setting('tests.anon', true)::integer;
begin
  select count(*) into v_avant from jsonb_object_keys(public.visuels_tournants(0));

  -- Un visiteur ne peut pas voir PLUS que le proprietaire des tables.
  -- L'inverse signalerait une fuite.
  if v_apres > v_avant then
    raise exception 'Un visiteur obtient % rayons contre % : la RLS ne s''applique pas.',
      v_apres, v_avant;
  end if;

  raise notice 'Lecture anonyme du tirage : % rayon(s) sur %.', v_apres, v_avant;
end $$;

-- --- Les rayons epingles restent prives ----------------------------------
do $$
declare v_tag uuid := current_setting('tests.tag_tirage', true)::uuid;
begin
  -- Pose en proprietaire : c'est l'etat de depart, pas ce qu'on teste.
  insert into public.tag_favorites (user_id, tag_id)
  values ('00000000-0000-0000-0000-0000000000a1', v_tag);
end $$;

-- Celui qui a epingle retrouve son rayon.
select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');
do $$
begin
  perform tests_assert(
    (select count(*) from public.tag_favorites) = 1,
    'Un membre ne retrouve pas le rayon qu''il a epingle.');
end $$;
reset role;

-- Un autre membre n'en voit rien, et ne peut pas en poser au nom du premier.
select tests_login('00000000-0000-0000-0000-0000000000a2',
                   '00000000-0000-0000-0000-0000000000f2');
do $$
declare v_tag uuid := current_setting('tests.tag_tirage', true)::uuid;
begin
  perform tests_assert(
    (select count(*) from public.tag_favorites) = 0,
    'Un membre voit les rayons epingles par quelqu''un d''autre.');

  begin
    insert into public.tag_favorites (user_id, tag_id)
    values ('00000000-0000-0000-0000-0000000000a1', v_tag);
    perform tests_assert(false, 'Un membre a epingle un rayon au nom d''un autre.');
  exception
    when insufficient_privilege then null;
  end;

  raise notice 'Rayons epingles : chacun ne voit et n''ecrit que les siens.';
end $$;
reset role;

rollback;
