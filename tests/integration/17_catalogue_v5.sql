-- Catalogue V5 : ce que l'import doit avoir produit, et ce qu'il ne doit
-- surtout pas avoir change.
--
-- L'import V5 touche 433 commandes deja en ligne. Le risque n'est pas qu'il
-- echoue bruyamment, c'est qu'il reussisse a moitie : un moteur qui recoit le
-- texte d'un autre, une commande rangee dans une famille invisible, un
-- questionnaire de l'ancien catalogue laisse au milieu du nouveau. Chacune de
-- ces trois pannes est silencieuse a l'ecran, et chacune a son controle ici.
begin;

do $$
declare
  v_n integer;
  v_image integer;
  v_texte integer;
begin
  -- --- Volumes -------------------------------------------------------

  -- `level` est le seul marqueur d'une commande passee en V5 : les colonnes
  -- de version restent celles de la V2, que la refonte ne reecrit pas.
  select count(*) into v_n from public.prompts where level is not null;
  perform tests_assert(v_n = 433, format('%s commandes V5 au lieu de 433.', v_n));

  select count(*) into v_image from public.prompts where level is not null and mode = 'image';
  select count(*) into v_texte from public.prompts where level is not null and mode = 'texte';
  perform tests_assert(v_image = 296, format('%s commandes image au lieu de 296.', v_image));
  perform tests_assert(v_texte = 137, format('%s commandes texte au lieu de 137.', v_texte));

  -- --- Un texte par moteur, et trois textes differents ----------------

  select count(*) into v_n
  from public.prompts p
  where p.level is not null
    and (select count(*) from public.prompt_variants v where v.prompt_id = p.id) <> 3;
  perform tests_assert(v_n = 0, format('%s commandes V5 sans leurs trois variantes.', v_n));

  select count(*) into v_n
  from public.prompt_variants v
  join public.prompts p on p.id = v.prompt_id and p.level is not null
  where not exists (
    select 1 from public.prompt_versions pv where pv.variant_id = v.id and pv.is_current
  );
  perform tests_assert(v_n = 0, format('%s variantes V5 sans version courante.', v_n));

  select count(*) into v_n
  from public.prompt_versions pv
  join public.prompt_variants v on v.id = pv.variant_id
  join public.prompts p on p.id = v.prompt_id and p.level is not null
  where pv.is_current and pv.version_label = 'v5-final';
  perform tests_assert(v_n = 1299, format('%s payloads V5 courants au lieu de 1299.', v_n));

  -- Le selecteur d'IA de la fiche ne sert a rien si les trois moteurs
  -- recoivent le meme texte : c'est exactement ce que la V5 corrige.
  select count(*) into v_n
  from public.prompts p
  where p.level is not null
    and (select count(distinct pv.payload)
         from public.prompt_variants v
         join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
         where v.prompt_id = p.id) <> 3;
  perform tests_assert(v_n = 0, format('%s commandes V5 servent le meme texte a deux moteurs.', v_n));

end $$;

-- --- Le bon texte au bon moteur ---------------------------------------
--
-- Les comptes ci-dessus passeraient encore si le texte de ChatGPT etait
-- servi a Gemini. L'empreinte, elle, ne passe que si chaque payload est
-- arrive a sa place : elle porte sur (commande, moteur, empreinte du texte),
-- triee, et vaut la meme chose que celle calculee sur le classeur source.
do $$
declare
  v_empreinte text;
begin
  select md5(string_agg(p.external_ref || '|' || pr.key || '|' ||
                        encode(extensions.digest(convert_to(pv.payload, 'UTF8'), 'sha256'), 'hex'),
                        ',' order by p.external_ref, pr.key))
    into v_empreinte
  from public.prompt_versions pv
  join public.prompt_variants v on v.id = pv.variant_id
  join public.ai_providers pr on pr.id = v.provider_id
  join public.prompts p on p.id = v.prompt_id and p.level is not null
  where pv.is_current;

  perform tests_assert(
    v_empreinte = '5bb9c0ad17a84bee1e1e35656db4af56',
    format('Les payloads V5 ne sont pas ceux du classeur (empreinte %s).', v_empreinte)
  );
end $$;

do $$
declare
  v_n integer;
begin
  -- --- Le questionnaire successif -------------------------------------

  select count(*) into v_n
  from public.prompt_questions q
  join public.prompts p on p.id = q.prompt_id
  where p.level is not null;
  perform tests_assert(v_n = 602, format('%s questions V5 au lieu de 602.', v_n));

  -- Quarante et une commandes ne posent aucune question : le contexte suffit.
  -- Elles ne doivent rien avoir garde de l'ancien questionnaire.
  select count(*) into v_n
  from public.prompts p
  where p.level is not null and p.max_questions is null
    and exists (select 1 from public.prompt_questions q where q.prompt_id = p.id);
  perform tests_assert(v_n = 0, format('%s commandes V5 sans plafond portent encore des questions.', v_n));

  -- Le plafond annonce vaut exactement ce que la commande peut poser.
  select count(*) into v_n
  from public.prompts p
  where p.level is not null
    and coalesce(p.max_questions, 0)
        <> (select count(*) from public.prompt_questions q where q.prompt_id = p.id);
  perform tests_assert(v_n = 0, format('%s commandes V5 annoncent un plafond faux.', v_n));

  -- --- Alias ----------------------------------------------------------

  -- Un alias mene toujours a une commande du catalogue V5, jamais a une
  -- commande restee en arriere : sinon il ouvrirait une fiche vide.
  select count(*) into v_n
  from public.prompt_aliases a
  join public.prompts canon on canon.id = a.canonical_prompt_id
  where canon.level is null;
  perform tests_assert(v_n = 0, format('%s alias mènent hors du catalogue V5.', v_n));

  select count(*) into v_n
  from public.prompt_aliases a
  where exists (select 1 from public.prompt_aliases b where b.alias_prompt_id = a.canonical_prompt_id);
  perform tests_assert(v_n = 0, format('%s alias forment une chaine.', v_n));

  -- Chaque mode porte son libelle lisible : c'est lui, et non le nom
  -- technique, que la fiche affiche sous « Elle sait aussi faire ». Un
  -- preset sans titre disparaitrait de la liste sans que rien ne le dise,
  -- et la commande semblerait couvrir moins de besoins qu'elle n'en couvre.
  select count(*) into v_n
  from public.prompt_aliases a
  where coalesce(a.preset ->> 'historical_title', '') = ''
     or coalesce(a.preset ->> 'mode', '') = '';
  perform tests_assert(v_n = 0, format('%s modes sans libelle ou sans nom.', v_n));

  -- --- Non-regression : rien ne disparait de l'ecran -------------------

  -- Le danger le plus concret de cet import : ranger une commande publiee
  -- dans une famille V5, qui est invisible tant que la bascule n'a pas eu
  -- lieu. La lecture publique exige une famille visible : la commande
  -- s'effacerait du catalogue a la seconde ou le lot passe.
  select count(*) into v_n
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.status = 'published' and not c.is_visible;
  perform tests_assert(v_n = 0, format('%s commandes publiees sont rangees dans une famille invisible.', v_n));

  select count(*) into v_n from public.categories
  where external_ref like '%-V5-%' and (is_visible or status <> 'draft');
  perform tests_assert(v_n = 0, format('%s familles V5 sont sorties du brouillon.', v_n));

  select count(*) into v_n from public.categories
  where external_ref is not null and external_ref not like '%-V5-%' and not is_visible;
  perform tests_assert(v_n = 0, format('%s familles V2 ont ete masquees par l''import.', v_n));

  -- --- Non-regression : les anciennes adresses repondent ---------------

  -- Quinze commandes changent de nom. Leur adresse publique, elle, ne doit
  -- pas suivre : le slug est ce qui figure dans un lien deja partage par
  -- message, et l'import n'ecrit jamais dans cette colonne.
  --
  -- Le controle porte sur les nouveaux noms plutot que sur les anciens : les
  -- anciens slugs different d'une base a l'autre (une adresse a pu etre
  -- corrigee depuis l'administration), alors qu'aucune de ces quinze fiches
  -- ne doit avoir pris l'adresse de son nouveau nom.
  --
  -- « invoice » ne figure pas dans la liste : cette adresse existait deja
  -- avant le renommage sur certaines bases, elle ne prouverait donc rien.
  select count(*) into v_n
  from public.prompts p
  where p.slug in (
    'messagepro', 'presskit', 'webinar', 'socialpost', 'creativebrief',
    'recruitmentkit', 'applicationkit', 'marketresearch', 'contractreview',
    'assessment', 'learn', 'debugfix', 'financialreview', 'pitchdeck'
  );
  perform tests_assert(v_n = 0, format('%s commandes renommees ont pris l''adresse de leur nouveau nom.', v_n));

  -- Deux adresses identiques rendraient une des deux fiches inatteignable.
  select count(*) into v_n from (
    select slug from public.prompts group by slug having count(*) > 1
  ) doublons;
  perform tests_assert(v_n = 0, format('%s adresses publiques en double.', v_n));

  -- --- Non-regression : les visuels ------------------------------------

  -- L'import editorial n'ecrit dans aucun champ media. Une commande image
  -- deja illustree l'est toujours apres.
  select count(*) into v_n
  from public.prompts p
  where p.level is not null and p.mode = 'image'
    and p.catalog_version = 'v2.1'
    and coalesce(p.default_image_path, '') = '';
  perform tests_assert(v_n = 0, format('%s commandes image V5 ont perdu leur visuel.', v_n));
end $$;

-- Le contenu complet reste hors de portee : la V5 n'ouvre aucune porte.
do $$
declare
  v_fuite integer;
begin
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
  perform tests_assert(v_fuite = 0, 'Le payload V5 est lisible par un role client.');
end $$;

rollback;
