-- Catalogue V2 : ce que l'import doit avoir produit, compte par compte.
--
-- L'import ne publie rien : les nouveaux raccourcis et les treize categories
-- arrivent en brouillon, et c'est la bascule de navigation qui les expose.
-- Les comptes ci-dessous ignorent donc le statut.
--
-- L'import precedent avait ete applique par morceaux sans compter ce qui
-- passait : 99 raccourcis sur 250 ne sont jamais arrives, et rien ne l'a
-- signale. Ce fichier existe pour que cela ne puisse plus arriver en silence.
begin;

do $$
declare
  v_n integer;
  v_texte integer;
  v_image integer;
begin
  -- --- Volumes -------------------------------------------------------

  select count(*) into v_n from public.prompts where catalog_version = 'v2.1';
  perform tests_assert(v_n = 320, format('%s raccourcis V2 au lieu de 320.', v_n));

  select count(*) into v_image from public.prompts
    where catalog_version = 'v2.1' and mode = 'image';
  select count(*) into v_texte from public.prompts
    where catalog_version = 'v2.1' and mode = 'texte';
  perform tests_assert(v_image = 130, format('%s raccourcis image au lieu de 130.', v_image));
  perform tests_assert(v_texte = 190, format('%s raccourcis texte au lieu de 190.', v_texte));

  -- Les familles V5 portent elles aussi une reference externe. Ce controle
  -- ne parle que des treize familles de la V2 : le compter autrement le
  -- ferait echouer a chaque famille ajoutee ailleurs.
  select count(*) into v_n from public.categories
  where external_ref is not null and external_ref not like '%-V5-%';
  perform tests_assert(v_n = 13, format('%s categories V2 au lieu de 13.', v_n));

  select count(*) into v_image from public.categories
    where external_ref like 'IMG-%' and external_ref not like '%-V5-%';
  select count(*) into v_texte from public.categories
    where external_ref like 'TXT-%' and external_ref not like '%-V5-%';
  perform tests_assert(v_image = 6, format('%s categories image au lieu de 6.', v_image));
  perform tests_assert(v_texte = 7, format('%s categories texte au lieu de 7.', v_texte));

  -- Le questionnaire de la V2, sans celui que le catalogue V5 a pose par
  -- dessus. `level` est le seul marqueur d'une commande passee en V5 : les
  -- 433 commandes canoniques y ont recu leurs propres questions successives,
  -- ce qui fait tomber le compte de 594 a 152. Les deux valeurs sont admises
  -- pour que ce controle dise la meme chose avant et apres cet import.
  select count(*) into v_n
  from public.prompt_questions q
  join public.prompts p on p.id = q.prompt_id
  where p.level is null;
  perform tests_assert(
    v_n in (594, 152),
    format('%s questions V2 au lieu de 594 (avant V5) ou 152 (apres).', v_n)
  );

  -- --- Integrite relationnelle ---------------------------------------

  -- Chaque raccourci V2 est rattache a l'une des treize categories : un
  -- orphelin n'apparait dans aucune puce et devient introuvable.
  select count(*) into v_n
  from public.prompts p
  where p.catalog_version = 'v2.1'
    and (p.category_id is null
         or not exists (select 1 from public.categories c
                        where c.id = p.category_id and c.external_ref is not null));
  perform tests_assert(v_n = 0, format('%s raccourcis V2 hors des treize categories.', v_n));

  -- Trois variantes par raccourci, une par IA, chacune avec une version
  -- courante : sans cela, resolve_prompt ne renvoie rien.
  select count(*) into v_n
  from public.prompts p
  where p.catalog_version = 'v2.1'
    and (select count(*) from public.prompt_variants v where v.prompt_id = p.id) <> 3;
  perform tests_assert(v_n = 0, format('%s raccourcis V2 sans leurs trois variantes.', v_n));

  select count(*) into v_n
  from public.prompt_variants v
  join public.prompts p on p.id = v.prompt_id and p.catalog_version = 'v2.1'
  where not exists (
    select 1 from public.prompt_versions pv where pv.variant_id = v.id and pv.is_current
  );
  perform tests_assert(v_n = 0, format('%s variantes V2 sans version courante.', v_n));

  -- --- Regles du moteur ----------------------------------------------

  -- R06 : un raccourci image doit produire une image, jamais une explication.
  select count(*) into v_n from public.prompts
  where catalog_version = 'v2.1' and mode = 'image' and output_type <> 'image';
  perform tests_assert(v_n = 0, format('%s raccourcis image sans sortie image.', v_n));

  -- R07 : la conduite a tenir quand la capacite manque est declaree.
  select count(*) into v_n
  from public.prompt_variants v
  join public.prompts p on p.id = v.prompt_id and p.catalog_version = 'v2.1'
  where v.fallback_behavior is null;
  perform tests_assert(v_n = 0, format('%s variantes sans conduite de repli.', v_n));

  -- R02 : commande unique, minuscule, conforme au motif.
  select count(*) into v_n from public.prompts
  where catalog_version = 'v2.1' and command::text !~ '^/[a-z][a-z0-9_]{2,31}$';
  perform tests_assert(v_n = 0, format('%s commandes hors motif R02.', v_n));

  -- R08 : chaque raccourci porte son chemin de visuel, chaque categorie son
  -- repli. Le fichier peut ne pas encore exister ; le chemin, lui, doit etre la.
  select count(*) into v_n from public.prompts
  where catalog_version = 'v2.1' and coalesce(default_image_path, '') = '';
  perform tests_assert(v_n = 0, format('%s raccourcis sans chemin de visuel.', v_n));

  select count(*) into v_n from public.categories
  where external_ref is not null and coalesce(fallback_image_path, '') = '';
  perform tests_assert(v_n = 0, format('%s categories sans visuel de repli.', v_n));
end $$;

-- Le contenu complet reste hors de portee, catalogue V2 compris.
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
  perform tests_assert(v_fuite = 0, 'Le payload V2 est lisible par un role client.');
end $$;

rollback;
