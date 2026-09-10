-- Le socle V5 n'ouvre qu'une place : quatorze familles invisibles, une table
-- d'alias et deux colonnes. Ce que ce fichier verifie, c'est qu'il n'a rien
-- change d'autre — et que la place ouverte est bien gardee.
begin;

-- --- Les familles V5 n'entrent pas dans le catalogue actuel --------------
do $$
declare v_v5 integer; v_v2 integer;
begin
  select count(*) into v_v5 from public.categories where external_ref like '%-V5-%';
  perform tests_assert(v_v5 = 14, format('%s familles V5 au lieu de 14.', v_v5));

  -- Ce que ce controle voulait dire quand les familles etaient encore
  -- vides : aucune ne doit s'ouvrir avant d'avoir de quoi remplir un rayon.
  -- Ecrit ainsi, il vaut avant comme apres la bascule.
  perform tests_assert(
    not exists (
      select 1 from public.categories f
      where f.external_ref like '%-V5-%' and f.is_visible
        and not exists (select 1 from public.prompts p
                        where p.category_id = f.id and p.status = 'published')
    ),
    'Une famille V5 est visible alors qu''elle est vide.');

  perform tests_assert(
    not exists (select 1 from public.categories
                where external_ref like '%-V5-%' and coalesce(fallback_image_path, '') = ''),
    'Une famille V5 n''a pas de visuel de repli (regle R08).');

  -- Les treize familles de la V2 restent en base quoi qu'il arrive : la
  -- bascule les archive, elle ne les supprime pas. Une famille effacee
  -- emporterait le rangement d'origine de 320 raccourcis.
  select count(*) into v_v2 from public.categories
  where external_ref is not null and external_ref not like '%-V5-%';
  perform tests_assert(v_v2 = 13, format('%s familles V2 en base au lieu de 13.', v_v2));

  -- Six image et huit texte, dans l'ordre du classeur.
  perform tests_assert(
    (select count(*) from public.categories where external_ref like 'IMG-V5-%') = 6
    and (select count(*) from public.categories where external_ref like 'TXT-V5-%') = 8,
    'La repartition des familles V5 ne suit pas le classeur.');
end;
$$;

-- --- Le niveau d'execution est une liste fermee --------------------------
do $$
begin
  update public.prompts set level = 'A' where id = '00000000-0000-0000-0000-0000000000d1';
  perform tests_assert(
    (select level from public.prompts where id = '00000000-0000-0000-0000-0000000000d1') = 'A',
    'Le niveau d''execution ne s''enregistre pas.');

  begin
    update public.prompts set level = 'Z' where id = '00000000-0000-0000-0000-0000000000d1';
    perform tests_assert(false, 'Un niveau hors de la liste a ete accepte.');
  exception when invalid_text_representation then null;
  end;
end;
$$;

-- --- Un alias ne fait ni boucle ni chaine --------------------------------
do $$
declare
  v_a uuid := '00000000-0000-0000-0000-0000000000d1';
  v_b uuid := '00000000-0000-0000-0000-0000000000d2';
  v_c uuid := '00000000-0000-0000-0000-0000000000d3';
begin
  -- Un raccourci ne peut pas se renvoyer a lui-meme.
  begin
    insert into public.prompt_aliases (alias_prompt_id, canonical_prompt_id) values (v_a, v_a);
    perform tests_assert(false, 'Un alias pointe sur lui-meme.');
  exception when check_violation then null;
  end;

  insert into public.prompt_aliases (alias_prompt_id, canonical_prompt_id, preset)
  values (v_a, v_b, '{"mode": "testxray"}'::jsonb);

  -- La destination ne peut pas devenir un alias a son tour.
  begin
    insert into public.prompt_aliases (alias_prompt_id, canonical_prompt_id) values (v_b, v_c);
    perform tests_assert(false, 'Une destination est devenue un alias : la chaine est ouverte.');
  exception when raise_exception then null;
  end;

  -- Un alias ne peut pas devenir une destination.
  begin
    insert into public.prompt_aliases (alias_prompt_id, canonical_prompt_id) values (v_c, v_a);
    perform tests_assert(false, 'Un alias est devenu une destination : la chaine est ouverte.');
  exception when raise_exception then null;
  end;

  -- Un raccourci n'a qu'une destination.
  begin
    insert into public.prompt_aliases (alias_prompt_id, canonical_prompt_id) values (v_a, v_c);
    perform tests_assert(false, 'Un raccourci porte deux alias.');
  exception when unique_violation then null;
  end;

  -- La destination ne se supprime pas sous les pieds de son alias.
  begin
    delete from public.prompts where id = v_b;
    perform tests_assert(false, 'Une destination d''alias a ete supprimee.');
  exception when foreign_key_violation then null;
  end;
end;
$$;

-- --- La table est lisible par tous, ecrite par personne d'autre ----------
select tests_logout();
do $$
begin
  perform count(*) from public.prompt_aliases;

  begin
    insert into public.prompt_aliases (alias_prompt_id, canonical_prompt_id)
    values ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d2');
    perform tests_assert(false, 'Un visiteur a cree un alias.');
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');
do $$
begin
  perform count(*) from public.prompt_aliases;

  begin
    insert into public.prompt_aliases (alias_prompt_id, canonical_prompt_id)
    values ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d2');
    perform tests_assert(false, 'Un membre a cree un alias.');
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.prompt_aliases;
    perform tests_assert(false, 'Un membre a supprime des alias.');
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- --- Le contenu complet reste hors de portee ------------------------------
-- Un alias ne doit pas devenir un chemin detourne vers un payload.
select tests_logout();
do $$
begin
  begin
    perform count(*) from public.prompt_versions;
    perform tests_assert(false, 'Un visiteur a lu prompt_versions.');
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

rollback;
