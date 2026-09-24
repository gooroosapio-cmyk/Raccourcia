-- =====================================================================
-- Catalogue v7 : ce que le schema garantit
--
--   * un tag peut appartenir au groupe « lieu », comme le veut la
--     taxonomie du kit ;
--   * `card_code` a la forme RCIA-C-000001 et ne se partage pas : deux
--     cartes ne peuvent pas porter le meme code ;
--   * `card_id` reste unique.
-- =====================================================================
begin;

do $$
declare v_ok boolean;
begin
  insert into public.tags (slug, name, groupe, description)
  values ('essai-lieu', 'Essai lieu', 'lieu', 'Un lieu d''essai.');
  perform tests_assert(exists (select 1 from public.tags where slug = 'essai-lieu' and groupe = 'lieu'),
    'Le groupe « lieu » n''est pas accepte.');

  update public.prompts set card_code = 'RCIA-C-009001'
  where id = '00000000-0000-0000-0000-0000000000d1';

  v_ok := false;
  begin
    update public.prompts set card_code = 'RCIA-C-009001'
    where id = '00000000-0000-0000-0000-0000000000d2';
  exception when unique_violation then v_ok := true;
  end;
  perform tests_assert(v_ok, 'Deux cartes ont pu porter le meme card_code.');

  v_ok := false;
  begin
    update public.prompts set card_code = 'carte-42'
    where id = '00000000-0000-0000-0000-0000000000d2';
  exception when check_violation then v_ok := true;
  end;
  perform tests_assert(v_ok, 'Un card_code mal forme a ete accepte.');

  update public.prompts set card_id = 'essai-identite'
  where id = '00000000-0000-0000-0000-0000000000d1';
  v_ok := false;
  begin
    update public.prompts set card_id = 'essai-identite'
    where id = '00000000-0000-0000-0000-0000000000d2';
  exception when unique_violation then v_ok := true;
  end;
  perform tests_assert(v_ok, 'Deux cartes ont pu partager un card_id.');
end $$;

rollback;
