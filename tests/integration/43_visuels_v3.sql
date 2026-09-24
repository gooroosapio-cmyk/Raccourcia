-- =====================================================================
-- Visuels V3 : la clef d'import et les bornes du formulaire
--
-- TROIS PROMESSES, ET ELLES SE VERIFIENT MAL A L'ECRAN.
--
--   * `card_id` est UNIQUE. Cette garantie N'ARRIVE PAS avec la V3 :
--     `prompts_card_id_unique` est pose par le socle V2 depuis
--     septembre. Elle est verrouillee ici parce que l'import V3 retombe
--     dessus a chaque passage — si deux cartes pouvaient porter le meme
--     identifiant, un second import poserait ses 862 cartes a cote des
--     premieres au lieu de les mettre a jour, et personne ne le verrait
--     avant que la galerie affiche tout en double. Un acquis dont
--     quelque chose depend merite son test, meme s'il est ancien.
--
--   * L'index est PARTIEL. 354 cartes Images et les 353 cartes ecrites
--     n'ont pas de `card_id`. Un index unique ordinaire les compterait
--     comme un seul doublon et refuserait la deuxieme. Ce test verifie
--     qu'on peut toujours poser plusieurs cartes sans identifiant.
--
--   * Le REGIME borne le formulaire. `standard` accepte zero a trois
--     champs, `marketing_affiche` deux a quatre. Un lot qui poserait huit
--     champs doit echouer en base : l'ecran de copie demanderait huit
--     informations avant de laisser copier, et c'est exactement le geste
--     de trop que la V3 cherche a supprimer.
-- =====================================================================
begin;

-- --- La clef d'import ne se dedouble pas --------------------------------
do $$
declare
  v_categorie uuid;
begin
  select id into v_categorie from public.categories limit 1;

  insert into public.prompts (command, name, slug, mode, short_description, card_id, category_id)
  values ('/essai-v3-un', 'Essai V3 un', 'essai-v3-un', 'image', 'Carte d''essai.',
          'aaaaaaaa-1111-5111-8111-aaaaaaaaaaaa', v_categorie);

  begin
    insert into public.prompts (command, name, slug, mode, short_description, card_id, category_id)
    values ('/essai-v3-deux', 'Essai V3 deux', 'essai-v3-deux', 'image', 'Carte d''essai.',
            'aaaaaaaa-1111-5111-8111-aaaaaaaaaaaa', v_categorie);
    perform tests_assert(false, 'Deux cartes ont pu porter le meme card_id.');
  exception
    when unique_violation then null;
  end;

  raise notice 'card_id : un identifiant, une carte.';
end $$;

-- --- Mais plusieurs cartes peuvent n'en avoir aucun ---------------------
do $$
declare
  v_categorie uuid;
  v_sans integer;
begin
  select id into v_categorie from public.categories limit 1;

  insert into public.prompts (command, name, slug, mode, short_description, card_id, category_id)
  values ('/essai-v3-sans-un', 'Essai sans un', 'essai-v3-sans-un', 'image', 'Sans identifiant.',
          null, v_categorie),
         ('/essai-v3-sans-deux', 'Essai sans deux', 'essai-v3-sans-deux', 'image', 'Sans identifiant.',
          null, v_categorie);

  select count(*) into v_sans from public.prompts
  where slug in ('essai-v3-sans-un', 'essai-v3-sans-deux');

  perform tests_assert(v_sans = 2,
    'Une carte sans card_id a ete refusee : l''index unique n''est pas partiel.');

  raise notice 'card_id absent : autant de cartes qu''on veut.';
end $$;

-- --- Le regime borne le nombre de champs --------------------------------
do $$
declare
  v_categorie uuid;
  v_quatre jsonb := '[{"cle":"a"},{"cle":"b"},{"cle":"c"},{"cle":"d"}]'::jsonb;
  v_un jsonb := '[{"cle":"a"}]'::jsonb;
begin
  select id into v_categorie from public.categories limit 1;

  -- Quatre champs en `standard` : refus attendu.
  begin
    insert into public.prompts (command, name, slug, mode, short_description, category_id,
                                regime_personnalisation, personnalisation)
    values ('/essai-v3-regime', 'Essai regime', 'essai-v3-regime', 'image', 'Essai.',
            v_categorie, 'standard', v_quatre);
    perform tests_assert(false, 'Quatre champs sont passes en regime standard.');
  exception
    when check_violation then null;
  end;

  -- Un seul champ en `marketing_affiche` : refus attendu aussi. Le regime
  -- pose un plancher autant qu'un plafond — une affiche a besoin de ses
  -- informations indispensables, et une seule n'y suffit pas.
  begin
    insert into public.prompts (command, name, slug, mode, short_description, category_id,
                                regime_personnalisation, personnalisation)
    values ('/essai-v3-affiche', 'Essai affiche', 'essai-v3-affiche', 'image', 'Essai.',
            v_categorie, 'marketing_affiche', v_un);
    perform tests_assert(false, 'Un seul champ est passe en regime marketing_affiche.');
  exception
    when check_violation then null;
  end;

  -- Zero champ en `standard` : c'est la copie directe, et elle est valide.
  insert into public.prompts (command, name, slug, mode, short_description, category_id,
                              regime_personnalisation, personnalisation)
  values ('/essai-v3-direct', 'Essai direct', 'essai-v3-direct', 'image', 'Essai.',
          v_categorie, 'standard', '[]'::jsonb);

  raise notice 'Regimes : les bornes tiennent, la copie directe passe.';
end $$;

-- --- Les bornes du rendu ------------------------------------------------
do $$
declare
  v_categorie uuid;
begin
  select id into v_categorie from public.categories limit 1;

  begin
    insert into public.prompts (command, name, slug, mode, short_description, category_id,
                                rendu_galerie)
    values ('/essai-v3-rendu', 'Essai rendu', 'essai-v3-rendu', 'image', 'Essai.',
            v_categorie, 'etirer');
    perform tests_assert(false, 'Un rendu de galerie invente a ete accepte.');
  exception
    when check_violation then null;
  end;

  begin
    insert into public.prompts (command, name, slug, mode, short_description, category_id,
                                organisation_sortie)
    values ('/essai-v3-orga', 'Essai orga', 'essai-v3-orga', 'image', 'Essai.',
            v_categorie, 'video');
    perform tests_assert(false, 'Une organisation de sortie inventee a ete acceptee.');
  exception
    when check_violation then null;
  end;

  raise notice 'Rendu et organisation : hors referentiel, refuses.';
end $$;

-- --- Les valeurs par defaut ne cassent aucune carte existante -----------
do $$
declare
  v_mauvaises integer;
begin
  -- Toute carte deja en base doit avoir recu des valeurs vides et non
  -- nulles sur les colonnes a defaut : un `jsonb_array_length(null)` dans
  -- la contrainte de regime ferait echouer une mise a jour sans rapport.
  select count(*) into v_mauvaises from public.prompts
  where personnalisation is null
     or defauts is null
     or references_fichiers is null
     or temoins_attendus is null
     or plateformes is null
     or capacites_requises is null;

  perform tests_assert(v_mauvaises = 0,
    format('%s cartes ont recu un defaut nul sur une colonne V3.', v_mauvaises));

  raise notice 'Defauts V3 : aucune carte existante laissee a null.';
end $$;

rollback;
