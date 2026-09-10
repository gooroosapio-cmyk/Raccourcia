-- Non-regression : ce que la refonte ne doit avoir casse pour personne.
--
-- Les fichiers precedents controlent chacun son lot. Celui-ci ne regarde
-- qu'une chose : l'etat du catalogue tel qu'un visiteur et un membre le
-- rencontrent, apres que tout a ete applique. Il ne connait ni les
-- references du classeur ni les comptes attendus — il verifie des proprietes
-- qui doivent tenir quel que soit le contenu, et qui tiendront encore au
-- prochain import.
begin;

do $$
declare
  v_n integer;
  v_publies integer;
begin
  -- --- Rien de ce qui est publie n'est un cul-de-sac -------------------

  select count(*) into v_publies
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.status = 'published' and c.is_visible;
  perform tests_assert(v_publies > 300,
    format('Le catalogue visible est tombe a %s commandes.', v_publies));

  -- Une commande publiee sans famille visible n'apparait dans aucune puce et
  -- disparait de la lecture publique : elle existe sans exister.
  select count(*) into v_n
  from public.prompts p
  where p.status = 'published'
    and (p.category_id is null
         or not exists (select 1 from public.categories c
                        where c.id = p.category_id and c.is_visible));
  perform tests_assert(v_n = 0, format('%s commandes publiees hors des familles visibles.', v_n));

  -- --- Tout ce qui est publie est copiable, sur les trois IA ------------

  -- C'est la promesse du produit : une commande visible se copie. Le
  -- controle porte sur ce que l'interface propose, et non sur les trois IA :
  -- une commande peut n'en declarer que deux, la fiche n'affiche alors que
  -- celles-la. Ce qu'elle ne doit jamais faire, c'est proposer une IA qui ne
  -- rend rien — le bouton tourne et l'utilisateur n'a aucun moyen de
  -- comprendre pourquoi.
  select count(*) into v_n
  from public.prompt_variants v
  join public.prompts p on p.id = v.prompt_id and p.status = 'published'
  join public.categories c on c.id = p.category_id and c.is_visible
  join public.ai_providers ia on ia.id = v.provider_id and ia.is_active
  where v.status = 'published'
    and not exists (
      select 1 from public.prompt_versions pv
      where pv.variant_id = v.id and pv.is_current and coalesce(pv.payload, '') <> ''
    );
  perform tests_assert(v_n = 0, format('%s IA proposees ne rendent aucun texte.', v_n));

  -- Et aucune commande visible ne doit se retrouver sans la moindre IA
  -- servable : sa carte porterait un bouton de copie sans destination.
  select count(*) into v_n
  from public.prompts p
  join public.categories c on c.id = p.category_id and c.is_visible
  where p.status = 'published'
    and not exists (
      select 1
      from public.prompt_variants v
      join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
      where v.prompt_id = p.id and v.status = 'published'
        and coalesce(pv.payload, '') <> ''
    );
  perform tests_assert(v_n = 0, format('%s commandes visibles ne se copient sur aucune IA.', v_n));

  -- --- Les noms de commandes restent utilisables ------------------------

  -- R02 : une commande se recopie dans une conversation. Une majuscule, un
  -- espace ou un accent, et ce qui est colle ne correspond a rien.
  select count(*) into v_n
  from public.prompts
  where status = 'published' and command::text !~ '^/[a-z][a-z0-9_]{2,31}$';
  perform tests_assert(v_n = 0, format('%s commandes publiees hors du motif R02.', v_n));

  -- Deux commandes homonymes rendraient la copie imprevisible.
  select count(*) into v_n from (
    select command from public.prompts where status = 'published'
    group by command having count(*) > 1
  ) doublons;
  perform tests_assert(v_n = 0, format('%s noms de commande en double.', v_n));

  -- Deux adresses identiques rendraient une fiche inatteignable.
  select count(*) into v_n from (
    select slug from public.prompts group by slug having count(*) > 1
  ) doublons;
  perform tests_assert(v_n = 0, format('%s adresses publiques en double.', v_n));

  -- --- Le palier d'essai existe toujours --------------------------------

  -- Sans commande offerte, un lien partage ne demontre plus rien et le
  -- produit n'a plus de porte d'entree.
  select count(*) into v_n
  from public.prompts p
  join public.categories c on c.id = p.category_id and c.is_visible
  where p.status = 'published' and p.is_free;
  perform tests_assert(v_n > 0, 'Plus aucune commande offerte n''est visible.');

  -- --- Les raccourcis devenus des modes restent en place -----------------

  -- Leur ligne porte les visuels, les favoris et l'historique de copie des
  -- membres. La supprimer ou la depublier romprait les liens deja partages.
  select count(*) into v_n
  from public.prompt_aliases a
  where not exists (select 1 from public.prompts p where p.id = a.alias_prompt_id);
  perform tests_assert(v_n = 0, format('%s alias pointent sur une ligne disparue.', v_n));
end $$;

-- --- Un visiteur copie reellement une commande offerte du catalogue ------
--
-- Les autres controles verifient des comptes ; celui-ci fait le geste. Il ne
-- nomme aucune commande : il prend celle que le catalogue offre au moment ou
-- le test tourne, et exige qu'elle rende son texte.
select tests_logout();
do $$
declare
  v_prompt uuid;
  v_ligne record;
begin
  select p.id into v_prompt
  from public.prompts p
  join public.categories c on c.id = p.category_id and c.is_visible
  where p.status = 'published' and p.is_free
  order by p.command
  limit 1;

  if v_prompt is null then
    perform tests_assert(false, 'Aucune commande offerte a essayer.');
  end if;

  select * into v_ligne
  from public.resolve_free_prompt(v_prompt, 'chatgpt', 'page-publique');

  perform tests_assert(v_ligne.command is not null,
    'Un visiteur n''obtient rien d''une commande offerte du catalogue.');
  perform tests_assert(length(coalesce(v_ligne.payload, '')) > 0,
    'La commande offerte du catalogue rend un texte vide.');
end $$;
reset role;

-- --- Et le contenu complet reste hors de portee --------------------------
do $$
declare
  v_fuite integer;
begin
  select count(*) into v_fuite
  from information_schema.table_privileges
  where table_schema = 'public' and table_name = 'prompt_versions'
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    and grantee in ('anon', 'authenticated');
  perform tests_assert(v_fuite = 0, 'Un role client peut lire ou ecrire prompt_versions.');

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
