-- Les analytics agregent en base et ne repondent qu'a un administrateur.
-- Un membre ne doit pas pouvoir mesurer le catalogue, ni deduire l'activite
-- des autres comptes.
begin;

-- Deux copies aujourd'hui, une copie hors fenetre courte.
insert into public.copy_events (user_id, prompt_id, provider_key, surface, created_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1',
   'chatgpt', 'detail', now()),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1',
   'gemini', 'carte', now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000d2',
   'chatgpt', 'detail', now() - interval '20 days');

select tests_login('00000000-0000-0000-0000-0000000000a3');
do $$
declare
  v_overview record;
  v_days integer;
  v_modes integer;
  v_top record;
begin
  -- Fenetre courte : la copie d'il y a 20 jours ne doit pas compter.
  select * into v_overview from public.admin_analytics_overview(7);
  perform tests_assert(v_overview.copies_period = 2,
    format('2 copies attendues sur 7 jours, %s.', v_overview.copies_period));
  perform tests_assert(v_overview.active_members = 1,
    format('1 membre actif attendu, %s.', v_overview.active_members));

  -- Fenetre large : les trois copies rentrent.
  select * into v_overview from public.admin_analytics_overview(30);
  perform tests_assert(v_overview.copies_period = 3,
    format('3 copies attendues sur 30 jours, %s.', v_overview.copies_period));
  perform tests_assert(v_overview.prompts_copied = 2,
    format('2 raccourcis copies attendus, %s.', v_overview.prompts_copied));

  -- La serie porte un point par jour, zeros compris : une courbe qui saute
  -- les jours vides ment par omission.
  select count(*) into v_days from public.admin_analytics_daily(7);
  perform tests_assert(v_days = 7, format('7 points attendus, %s.', v_days));
  perform tests_assert(
    (select copies from public.admin_analytics_daily(7) where day = current_date) = 2,
    'Les copies du jour ne sont pas comptees correctement.');

  -- La repartition couvre les trois axes.
  select count(distinct dimension) into v_modes from public.admin_analytics_breakdown(30);
  perform tests_assert(v_modes = 3,
    format('3 axes de repartition attendus (mode, ia, surface), %s.', v_modes));

  -- Le classement remonte d'abord le plus copie.
  select * into v_top from public.admin_analytics_top_prompts(7, 5) limit 1;
  perform tests_assert(v_top.prompt_id = '00000000-0000-0000-0000-0000000000d1',
    'Le raccourci le plus copie n''arrive pas en tete.');
  perform tests_assert(v_top.copies = 2, format('2 copies attendues, %s.', v_top.copies));

  -- Un raccourci publie jamais copie doit ressortir : c'est la liste qui
  -- appelle une decision editoriale.
  perform tests_assert(
    exists (
      select 1 from public.admin_analytics_unused_prompts(7, 50)
      where prompt_id = '00000000-0000-0000-0000-0000000000d2'
    ),
    'Un raccourci publie sans copie recente devrait apparaitre comme dormant.');

  -- La fenetre est bornee : une valeur aberrante ne declenche pas un
  -- balayage complet ni une erreur.
  perform public.admin_analytics_overview(100000);
  perform public.admin_analytics_overview(-5);
  perform public.admin_analytics_overview(null);
end;
$$;
reset role;

-- --- Un membre n'a acces a aucune de ces mesures --------------------------
select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');
do $$
begin
  begin
    perform public.admin_analytics_overview(30);
    perform tests_assert(false, 'Un membre a pu lire les analytics.');
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.admin_analytics_top_prompts(30, 10);
    perform tests_assert(false, 'Un membre a pu lire le classement des raccourcis.');
  exception when insufficient_privilege then null;
  end;

  -- La fonction de bornage n'est pas un point d'entree client.
  begin
    perform public.analytics_window(30);
    perform tests_assert(false, 'Un membre a pu appeler analytics_window.');
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select tests_logout();
do $$
begin
  begin
    perform public.admin_analytics_daily(30);
    perform tests_assert(false, 'Un visiteur anonyme a pu lire les analytics.');
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

rollback;
