-- Un raccourci offert doit se copier sans compte : c'est le seul mecanisme
-- d'essai du produit, et un lien partage n'a de valeur que s'il demontre
-- quelque chose. Tout le reste du catalogue reste ferme a un visiteur.
begin;

-- --- Le visiteur copie ce qui est offert ---------------------------------
select tests_logout();
do $$
declare v_ligne record;
begin
  select * into v_ligne
  from public.resolve_free_prompt(
    '00000000-0000-0000-0000-0000000000d2', 'chatgpt', 'page-publique');

  perform tests_assert(v_ligne.command = '/testfree',
    'Le visiteur doit recevoir la commande offerte.');
  perform tests_assert(length(coalesce(v_ligne.payload, '')) > 0,
    'Le visiteur doit recevoir le contenu complet du raccourci offert.');
end;
$$;
reset role;

-- --- Et rien d'autre -----------------------------------------------------
-- Le brouillon est rendu gratuit avant de basculer en visiteur : un anonyme
-- n'ecrit rien dans `prompts`, et c'est bien ce qu'on veut verifier ailleurs.
update public.prompts set is_free = true
where id = '00000000-0000-0000-0000-0000000000d3';

select tests_logout();
do $$
begin
  -- Raccourci reserve aux membres.
  begin
    perform public.resolve_free_prompt('00000000-0000-0000-0000-0000000000d1', 'chatgpt');
    perform tests_assert(false, 'Un visiteur a copie un raccourci reserve.');
  exception when insufficient_privilege then null;
  end;

  -- Brouillon, meme rendu gratuit : il n'est pas publie.
  begin
    perform public.resolve_free_prompt('00000000-0000-0000-0000-0000000000d3', 'chatgpt');
    perform tests_assert(false, 'Un visiteur a copie un brouillon.');
  exception when insufficient_privilege then null;
  end;

  -- IA inconnue ou inactive.
  begin
    perform public.resolve_free_prompt('00000000-0000-0000-0000-0000000000d2', 'inconnue');
    perform tests_assert(false, 'Une IA inconnue a renvoye un contenu.');
  exception when insufficient_privilege then null;
  end;

  -- La porte des membres reste fermee : `resolve_prompt` n'est pas accordee
  -- au role anonyme, la fonction n'est meme pas executable.
  begin
    perform public.resolve_prompt('00000000-0000-0000-0000-0000000000d2', 'chatgpt');
    perform tests_assert(false, 'Un visiteur a appele la resolution des membres.');
  exception when insufficient_privilege then null;
  end;

  -- Ni la table des payloads, evidemment.
  begin
    perform count(*) from public.prompt_versions;
    perform tests_assert(false, 'Un visiteur a lu prompt_versions.');
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- --- Categorie masquee : le raccourci offert disparait aussi -------------
update public.categories set is_visible = false
where id = '00000000-0000-0000-0000-0000000000c1';

select tests_logout();
do $$
begin
  begin
    perform public.resolve_free_prompt('00000000-0000-0000-0000-0000000000d2', 'chatgpt');
    perform tests_assert(false, 'Un raccourci d''une categorie masquee a ete copie.');
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

update public.categories set is_visible = true
where id = '00000000-0000-0000-0000-0000000000c1';

-- --- Un membre sans acces copie aussi ce qui est offert ------------------
select tests_login('00000000-0000-0000-0000-0000000000a2',
                   '00000000-0000-0000-0000-0000000000f2');
do $$
declare v_ligne record;
begin
  select * into v_ligne
  from public.resolve_free_prompt('00000000-0000-0000-0000-0000000000d2', 'chatgpt');
  perform tests_assert(v_ligne.command = '/testfree',
    'Un membre sans acces doit pouvoir copier un raccourci offert.');
end;
$$;
reset role;

-- --- La copie anonyme est journalisee sans compte ------------------------
do $$
begin
  perform tests_assert(
    (select count(*) from public.copy_events
      where prompt_id = '00000000-0000-0000-0000-0000000000d2' and user_id is null) >= 1,
    'Une copie anonyme doit laisser une trace sans identifiant de compte.');

  perform tests_assert(
    (select count(*) from public.copy_events
      where prompt_id = '00000000-0000-0000-0000-0000000000d2'
        and user_id = '00000000-0000-0000-0000-0000000000a2') = 1,
    'La copie d''un membre doit rester rattachee a son compte.');
end;
$$;

rollback;
