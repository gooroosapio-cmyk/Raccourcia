-- L'ordre du catalogue tient en base : une carte sans visuel ferme la marche
-- dans toute la categorie, pas seulement dans le lot charge, et l'etoile
-- d'administration n'obeit qu'a un administrateur.
begin;

-- --- media_ready suit les medias, pas l'appelant -------------------------
do $$
declare v_id uuid := '00000000-0000-0000-0000-0000000000d1';
begin
  -- Carte sans visuel demande : rien a attendre, la carte est prete.
  perform tests_assert(
    (select media_ready from public.prompts where id = v_id),
    'Une carte sans visuel demande doit etre prete a s''afficher.');

  -- Des qu'on demande la carte visuelle, l'apercu manque.
  update public.prompts set show_image_card = true where id = v_id;
  perform tests_assert(
    not (select media_ready from public.prompts where id = v_id),
    'Une carte visuelle sans apercu ne doit pas etre declaree prete.');

  -- Le visuel de resultat suffit ; le visuel « avant » seul ne suffit pas.
  insert into public.prompt_media (prompt_id, kind, storage_path)
  values (v_id, 'before', 'test/avant.webp');
  perform tests_assert(
    not (select media_ready from public.prompts where id = v_id),
    'Le visuel « avant » seul ne montre pas le resultat.');

  insert into public.prompt_media (prompt_id, kind, storage_path)
  values (v_id, 'after', 'test/apres.webp');
  perform tests_assert(
    (select media_ready from public.prompts where id = v_id),
    'Le visuel de resultat doit rendre la carte prete.');

  -- Et la colonne redescend quand le visuel disparait.
  delete from public.prompt_media where prompt_id = v_id and kind = 'after';
  perform tests_assert(
    not (select media_ready from public.prompts where id = v_id),
    'Retirer le visuel de resultat doit remettre la carte en attente.');
end;
$$;

-- --- L'etoile n'est pas a portee du client -------------------------------
select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');
do $$
begin
  -- L'ecriture directe ne leve rien : la policy ne laisse simplement aucune
  -- ligne a modifier. C'est la valeur d'apres qui fait foi, pas l'absence
  -- d'erreur — un test qui attendrait une exception passerait a cote.
  update public.prompts set is_pinned = true
  where id = '00000000-0000-0000-0000-0000000000d2';
  perform tests_assert(
    not exists (select 1 from public.prompts
                where id = '00000000-0000-0000-0000-0000000000d2' and is_pinned),
    'Un membre a epingle un raccourci en ecriture directe.');

  begin
    perform public.admin_set_prompt_pinned('00000000-0000-0000-0000-0000000000d2', true);
    perform tests_assert(false, 'Un membre a epingle un raccourci par la fonction.');
  exception when raise_exception then null;
  end;

  -- Les declencheurs de recalcul ne sont pas appelables depuis le client.
  begin
    perform public.prompt_media_ready_refresh('00000000-0000-0000-0000-0000000000d2');
    perform tests_assert(false, 'Un membre a declenche le recalcul des visuels.');
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- --- L'administrateur epingle, et la trace reste -------------------------
select tests_login('00000000-0000-0000-0000-0000000000a3');
do $$
declare v_id uuid := '00000000-0000-0000-0000-0000000000d2';
begin
  perform public.admin_set_prompt_pinned(v_id, true);
  perform tests_assert(
    (select is_pinned from public.prompts where id = v_id),
    'L''administrateur doit pouvoir remonter un raccourci.');

  perform public.admin_set_prompt_pinned(v_id, false);
  perform tests_assert(
    not (select is_pinned from public.prompts where id = v_id),
    'L''administrateur doit pouvoir redescendre un raccourci.');

  perform tests_assert(
    (select count(*) from public.admin_audit_logs
      where entity_id = v_id and action in ('prompt_pinned', 'prompt_unpinned')) = 2,
    'Chaque epinglage doit laisser une trace.');

  begin
    perform public.admin_set_prompt_pinned(
      '00000000-0000-0000-0000-0000000000dd', true);
    perform tests_assert(false, 'Un raccourci inexistant a ete epingle.');
  exception when raise_exception then null;
  end;
end;
$$;
reset role;

-- --- Masquer retire immediatement du catalogue ---------------------------
select tests_login('00000000-0000-0000-0000-0000000000a3');
select public.admin_set_prompt_status('00000000-0000-0000-0000-0000000000d2', 'draft');
reset role;

select tests_logout();
do $$
begin
  perform tests_assert(
    not exists (select 1 from public.prompts
                where id = '00000000-0000-0000-0000-0000000000d2'),
    'Un raccourci masque doit disparaitre du catalogue public.');
end;
$$;
reset role;

-- Remettre en ligne reste possible meme sans paire de visuels complete :
-- le bouton « masquer » ne doit pas etre une porte a sens unique.
select tests_login('00000000-0000-0000-0000-0000000000a3');
do $$
begin
  update public.prompts set show_image_card = true
  where id = '00000000-0000-0000-0000-0000000000d2';
  perform public.admin_set_prompt_status('00000000-0000-0000-0000-0000000000d2', 'published');
  perform tests_assert(
    (select status from public.prompts
      where id = '00000000-0000-0000-0000-0000000000d2') = 'published',
    'Un raccourci masque doit pouvoir revenir en ligne sans visuel.');
end;
$$;
reset role;

rollback;
