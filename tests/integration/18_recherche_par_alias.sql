-- Retrouver une commande sous un nom qu'elle n'a plus.
--
-- La refonte V5 regroupe cent quarante-six raccourcis en modes d'une
-- commande canonique et en renomme quinze. Quelqu'un qui a garde
-- « /adsocial » ou « /emailpro » en tete tape ce nom : s'il tombe sur une
-- page vide, la refonte lui a retire un outil qu'il avait. Ce fichier
-- verifie les deux chemins qui l'en empechent — la recherche et le lien
-- deja partage — et verifie qu'aucun des deux n'ouvre une porte de trop.
begin;

do $$
declare
  v_n integer;
begin
  -- --- Les noms alternatifs sont la ------------------------------------

  select count(*) into v_n from public.prompts
  where level is not null and cardinality(aliases) = 0;
  perform tests_assert(v_n = 0, format('%s commandes V5 ne repondent a aucun autre nom.', v_n));

  -- La colonne de comparaison suit la liste sans que rien n'ait a la tenir
  -- a jour : c'est une colonne generee, et c'est ce qui la rend fiable.
  select count(*) into v_n from public.prompts
  where level is not null and coalesce(search_aliases, '') = '';
  perform tests_assert(v_n = 0, format('%s commandes V5 sans forme de comparaison.', v_n));

  -- --- Les quinze renommees repondent a leur ancien nom -----------------

  select count(*) into v_n
  from (values
    ('RCI-TXT-016', 'pitchdecktext'), ('RCI-TXT-059', 'webinaroutline'),
    ('RCI-TXT-004', 'emailpro'),      ('RCI-TXT-007', 'linkedinpost'),
    ('RCI-TXT-020', 'pressrelease'),  ('RCI-TXT-022', 'briefcreative'),
    ('RCI-ANA-007', 'marketmap'),     ('RCI-ANA-027', 'contractscan'),
    ('RCI-TXT-035', 'jobpost'),       ('RCI-TXT-036', 'cvrewrite'),
    ('RCI-TXT-039', 'quiz'),          ('RCI-TXT-090', 'debugplan'),
    ('RCI-TXT-091', 'studynotes'),    ('RCI-ANA-028', 'financialsnapshot'),
    ('RCI-TXT-234', 'invoicegenerator')
  ) as attendu(ref, ancien)
  join public.prompts p on p.external_ref = attendu.ref
  where p.search_aliases not like '%' || attendu.ancien || '%';
  perform tests_assert(v_n = 0, format('%s commandes renommees ne repondent plus a leur ancien nom.', v_n));

  -- --- Un mode absorbe ramene bien sa commande --------------------------

  -- /adsocial n'est plus une commande : c'est un mode de /adcreative. Taper
  -- l'ancien nom doit ramener la commande qui fait le travail.
  select count(*) into v_n
  from public.prompts p
  where p.search_aliases like '%adsocial%' and p.command::text = '/adcreative';
  perform tests_assert(v_n = 1, '/adcreative ne repond pas au nom /adsocial.');

  -- --- La mission est cherchable ---------------------------------------

  -- L'intention porte la situation decrite par le classeur : c'est par elle
  -- qu'une recherche par besoin, et non par nom, trouve la commande.
  select count(*) into v_n from public.prompts
  where level is not null and coalesce(intention, '') = '';
  perform tests_assert(v_n = 0, format('%s commandes V5 sans intention.', v_n));

  select count(*) into v_n from public.prompts
  where level is not null
    and search_norm not like '%' || public.texte_normalise(intention) || '%';
  perform tests_assert(v_n = 0, format('%s intentions V5 hors du champ de recherche.', v_n));

  -- --- Les liens deja partages ------------------------------------------

  -- Un alias dont la destination est publiee et visible conduit a elle.
  --
  -- La condition n'est pas decorative : une base de recette ne contient pas
  -- toujours tout le catalogue, et les commandes qu'elle vient de creer y
  -- sont en brouillon. Exiger que tout alias resolve y echouerait sans
  -- qu'aucun lien reel soit casse.
  select count(*) into v_n
  from public.prompt_aliases a
  join public.prompts ancien on ancien.id = a.alias_prompt_id
  join public.prompts canon on canon.id = a.canonical_prompt_id
  join public.categories famille on famille.id = canon.category_id
  where canon.status = 'published' and famille.is_visible
    and not exists (select 1 from public.resoudre_alias(ancien.slug));
  perform tests_assert(v_n = 0, format('%s anciennes adresses ne menent nulle part.', v_n));

  -- Et elle conduit a la bonne : renvoyer une fiche au hasard serait pire
  -- qu'une page introuvable.
  select count(*) into v_n
  from public.prompt_aliases a
  join public.prompts ancien on ancien.id = a.alias_prompt_id
  join public.prompts canon on canon.id = a.canonical_prompt_id
  join public.categories famille on famille.id = canon.category_id
  cross join lateral public.resoudre_alias(ancien.slug) r
  where canon.status = 'published' and famille.is_visible
    and r.slug <> canon.slug;
  perform tests_assert(v_n = 0, format('%s anciennes adresses menent a la mauvaise fiche.', v_n));

  -- Le mode voyage avec l'adresse : c'est lui qui dit dans quelle variante
  -- la commande canonique doit s'ouvrir.
  select count(*) into v_n
  from public.prompt_aliases a
  join public.prompts ancien on ancien.id = a.alias_prompt_id
  join public.prompts canon on canon.id = a.canonical_prompt_id
  join public.categories famille on famille.id = canon.category_id
  cross join lateral public.resoudre_alias(ancien.slug) r
  where canon.status = 'published' and famille.is_visible
    and coalesce(r.preset ->> 'mode', '') = '';
  perform tests_assert(v_n = 0, format('%s anciennes adresses arrivent sans mode.', v_n));

  -- Une adresse qui n'a jamais existe ne mene nulle part : la page doit
  -- rester introuvable plutot que d'ouvrir la premiere fiche venue.
  select count(*) into v_n from public.resoudre_alias('cette-adresse-n-a-jamais-existe');
  perform tests_assert(v_n = 0, 'Une adresse inconnue est resolue vers une fiche.');
end $$;

-- --- Ce que la fonction ne doit pas ouvrir ------------------------------
--
-- `resoudre_alias` lit des lignes que la lecture publique ne montre pas :
-- elle doit rester une porte etroite. Un brouillon, ou une commande rangee
-- dans une famille invisible, ne doit jamais en sortir.
do $$
declare
  v_prompt uuid;
  v_ancien uuid;
  v_n integer;
begin
  select a.canonical_prompt_id, a.alias_prompt_id into v_prompt, v_ancien
  from public.prompt_aliases a limit 1;

  if v_prompt is null then
    raise notice 'Aucun alias dans cette base : controle de fuite ignore.';
    return;
  end if;

  update public.prompts set status = 'draft' where id = v_prompt;

  select count(*) into v_n
  from public.prompts ancien
  cross join lateral public.resoudre_alias(ancien.slug) r
  where ancien.id = v_ancien;
  perform tests_assert(v_n = 0, 'Une ancienne adresse ouvre une commande en brouillon.');
end $$;

-- --- Un visiteur peut suivre un ancien lien, rien de plus ---------------
do $$
declare
  v_n integer;
begin
  perform set_config('role', 'anon', true);

  -- La fonction est ouverte : sans elle, un lien partage se solderait par
  -- une page introuvable pour la moitie des gens.
  select count(*) into v_n from public.resoudre_alias('inconnu');
  perform tests_assert(v_n = 0, 'Un visiteur obtient une destination pour une adresse inconnue.');

  perform set_config('role', 'postgres', true);
end $$;

do $$
declare
  v_fuite integer;
begin
  -- La colonne de comparaison ne contient que des noms de commandes, deja
  -- publics. Le contenu complet, lui, reste hors de portee.
  select count(*) into v_fuite
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'prompt_versions'
    and column_name = 'payload'
    -- Sur `privilege_type` et non sur la seule presence d'une ligne : la
    -- production accorde `REFERENCES` sur toutes les colonnes, ce qui ne
    -- permet pas de lire une seule valeur. Compter large aurait fait crier
    -- ce controle sur une base saine, et un controle qui crie a tort
    -- finit par ne plus etre lu.
    and privilege_type = 'SELECT'
    and grantee in ('anon', 'authenticated');
  perform tests_assert(v_fuite = 0, 'Le payload est lisible par un role client.');
end $$;

rollback;
