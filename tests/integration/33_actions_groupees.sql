-- =====================================================================
-- Les actions groupees ne contournent rien
--
-- Publier cinquante raccourcis d'un geste est indispensable a partir de
-- quelques milliers d'entrees. C'est aussi le meilleur endroit pour perdre
-- un controle en chemin : on ecrit une boucle, on oublie que la version
-- unitaire verifiait quelque chose, et le catalogue se retrouve avec des
-- commandes publiees sans texte a copier.
--
-- Ce test verifie que le role est exige, que les controles de qualite
-- tiennent, qu'une ligne refusee n'emporte pas les autres, et que le plafond
-- protege la connexion.
-- =====================================================================
begin;

-- --- Un membre ne peut rien declencher en masse --------------------------
select tests_login('00000000-0000-0000-0000-0000000000a2',
                   '00000000-0000-0000-0000-0000000000f2');
do $$
begin
  begin
    perform public.admin_set_prompts_status(
      array['00000000-0000-0000-0000-0000000000d3']::uuid[], 'archived');
    perform tests_assert(false, 'Un membre a archive des raccourcis en masse.');
  exception when sqlstate '42501' then null;
  end;

  begin
    perform public.admin_set_prompts_free(
      array['00000000-0000-0000-0000-0000000000d3']::uuid[], true);
    perform tests_assert(false, 'Un membre a offert des raccourcis en masse.');
  exception when sqlstate '42501' then null;
  end;
end;
$$;
reset role;

-- --- Un administrateur : ce qui passe passe, ce qui echoue est rapporte ---
select tests_login('00000000-0000-0000-0000-0000000000a3');
do $$
declare
  v_bon uuid;
  v_incomplet uuid;
  v_res record;
begin
  -- Une commande deja publiee : elle repassera en brouillon sans probleme.
  select id into v_bon from public.prompts
  where status = 'published' limit 1;
  perform tests_assert(v_bon is not null, 'Aucune commande publiee pour le test.');

  -- Une commande incomplete : la publication doit la refuser, comme le fait
  -- deja la version unitaire.
  insert into public.prompts (command, name, slug, mode, short_description, status)
  values ('/testgroupe', 'Incomplet groupe', 'testgroupe', 'texte',
          'Sans categorie ni version.', 'draft')
  returning id into v_incomplet;

  -- --- Le refus d'une ligne n'emporte pas les autres ---------------------
  select * into v_res from public.admin_set_prompts_status(
    array[v_bon, v_incomplet]::uuid[], 'published');

  perform tests_assert(v_res.traites = 1,
    format('Attendu 1 raccourci traite, obtenu %s.', v_res.traites));
  perform tests_assert(v_res.refuses = 1,
    format('Attendu 1 raccourci refuse, obtenu %s.', v_res.refuses));
  perform tests_assert(array_length(v_res.motifs, 1) >= 1,
    'Un refus sans motif : impossible de savoir laquelle bloque.');

  -- Le controle de qualite a bien tenu : l'incomplete n'est pas passee.
  perform tests_assert(
    (select status from public.prompts where id = v_incomplet) = 'draft',
    'Une commande incomplete a ete publiee par le lot.');

  -- --- Le geste « offert » s'applique bien -------------------------------
  select * into v_res from public.admin_set_prompts_free(array[v_bon]::uuid[], true);
  perform tests_assert(v_res.traites = 1, 'Le passage en offert n''a pas eu lieu.');
  perform tests_assert(
    (select is_free from public.prompts where id = v_bon),
    'Le raccourci n''est pas marque comme offert.');

  -- --- Une liste vide ne fait rien, et ne leve pas -----------------------
  select * into v_res from public.admin_set_prompts_status(array[]::uuid[], 'draft');
  perform tests_assert(v_res.traites = 0 and v_res.refuses = 0,
    'Une liste vide a produit un effet.');

  -- --- Le plafond protege la connexion -----------------------------------
  begin
    select * into v_res from public.admin_set_prompts_status(
      (select array_agg(gen_random_uuid()) from generate_series(1, 201))::uuid[], 'draft');
    perform tests_assert(false, 'Deux cent une lignes ont ete acceptees.');
  exception when sqlstate '22023' then null;
  end;
end;
$$;
reset role;

rollback;
