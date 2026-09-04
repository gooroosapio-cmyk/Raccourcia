-- Exigence produit : desactiver une categorie ou une sous-categorie masque
-- tous les prompts enfants cote utilisateur, sans supprimer les donnees.
begin;

select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');

do $$
declare v_visible integer;
begin
  select count(*) into v_visible from public.prompts
  where id = '00000000-0000-0000-0000-0000000000d1';
  perform tests_assert(v_visible = 1, 'Le prompt devrait etre visible au depart.');
end;
$$;
reset role;

-- Desactivation de la SOUS-categorie.
update public.categories set status = 'draft'
where id = '00000000-0000-0000-0000-0000000000c2';

select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');
do $$
declare v_visible integer;
begin
  select count(*) into v_visible from public.prompts
  where id = '00000000-0000-0000-0000-0000000000d1';
  perform tests_assert(v_visible = 0,
    'Une sous-categorie desactivee doit masquer ses prompts.');

  -- Le payload ne doit plus etre resolvable non plus.
  begin
    perform public.resolve_prompt('00000000-0000-0000-0000-0000000000d1', 'chatgpt');
    perform tests_assert(false,
      'Un prompt d''une sous-categorie desactivee reste resolvable.');
  exception when sqlstate '42501' then null;
  end;
end;
$$;
reset role;

-- La donnee est conservee : l'admin la voit toujours.
select tests_login('00000000-0000-0000-0000-0000000000a3');
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.prompts
  where id = '00000000-0000-0000-0000-0000000000d1';
  perform tests_assert(v_count = 1, 'L''admin doit continuer a voir le prompt masque.');
end;
$$;
reset role;

-- Reactivation : retour immediat a la visibilite, sans reimport.
update public.categories set status = 'published'
where id = '00000000-0000-0000-0000-0000000000c2';

select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');
do $$
declare v_visible integer;
begin
  select count(*) into v_visible from public.prompts
  where id = '00000000-0000-0000-0000-0000000000d1';
  perform tests_assert(v_visible = 1, 'La reactivation doit rendre le prompt visible.');
end;
$$;
reset role;

-- Desactivation de la categorie PARENTE : la cascade doit masquer la
-- sous-categorie et donc les prompts qu'elle porte.
update public.categories set status = 'archived'
where id = '00000000-0000-0000-0000-0000000000c1';

do $$
declare v_child_visible boolean;
begin
  select is_visible into v_child_visible from public.categories
  where id = '00000000-0000-0000-0000-0000000000c2';
  perform tests_assert(v_child_visible = false,
    'La sous-categorie doit devenir invisible quand sa parente est archivee.');
end;
$$;

select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');
do $$
declare v_visible integer;
begin
  select count(*) into v_visible from public.prompts
  where id in ('00000000-0000-0000-0000-0000000000d1',
               '00000000-0000-0000-0000-0000000000d2');
  perform tests_assert(v_visible = 0,
    'Une categorie parente desactivee doit masquer toute sa descendance.');
end;
$$;
reset role;

rollback;
