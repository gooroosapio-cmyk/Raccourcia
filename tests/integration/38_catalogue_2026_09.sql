-- =====================================================================
-- Le catalogue de septembre 2026
--
-- Ce lot installe 1 010 cartes a cote du catalogue en ligne, sans rien
-- publier ni rien effacer. Les garanties a tenir ne sont donc pas celles
-- d'un contenu, mais celles d'une cohabitation :
--
--   * une commande porte plusieurs cartes, et le schema le permet
--     vraiment — c'est le changement structurel de ce lot ;
--   * rien n'est publie : le fichier d'import le declare, et un lot qui
--     publierait ferait disparaitre le catalogue en ligne derriere mille
--     cartes sans visuel ;
--   * rien n'est efface : les commandes publiees avant l'import le restent ;
--   * aucun visuel n'est touche ;
--   * aucune carte orpheline, aucun payload manquant, aucune fiche qui
--     demande plus de trois informations.
-- =====================================================================
begin;

-- --- Plusieurs cartes pour une meme commande -----------------------------
do $$
declare
  v_cartes integer;
  v_commandes integer;
  v_multi integer;
begin
  select count(*), count(distinct command_id) into v_cartes, v_commandes
  from public.prompts where external_ref like 'V2-%';

  -- Rien a verifier si le lot n'a pas ete applique : la suite tourne aussi
  -- sur une base ou seul le catalogue precedent existe.
  if v_cartes = 0 then return; end if;

  perform tests_assert(
    v_cartes > v_commandes,
    'Le catalogue V2 compte autant de cartes que de commandes : la separation commande/carte n''a pas pris.');

  select count(*) into v_multi from (
    select command_id from public.prompts
    where external_ref like 'V2-%' group by command_id having count(*) > 1) x;

  perform tests_assert(
    v_multi > 0,
    'Aucune commande ne porte plusieurs cartes.');

  -- Et le schema l'autorise pour de bon : deux cartes actives d'une meme
  -- commande doivent pouvoir coexister.
  perform tests_assert(
    not exists (
      select 1 from public.prompts p
      where p.external_ref like 'V2-%' and p.card_slug is null
        and (select count(*) from public.prompts q
             where q.command_id = p.command_id and q.external_ref like 'V2-%') > 1),
    'Une commande a plusieurs cartes dont l''une n''a pas de slug de carte : elles ne se distinguent pas.');
end $$;

-- --- Le lot n'a rien publie ni rien efface -------------------------------
do $$
declare
  v_v2 integer;
  v_publiees_v2 integer;
begin
  select count(*) into v_v2 from public.prompts where external_ref like 'V2-%';
  if v_v2 = 0 then return; end if;

  select count(*) into v_publiees_v2
  from public.prompts where external_ref like 'V2-%' and status = 'published';

  -- Le lot d'import installe en brouillon ; c'est la fusion qui publie, et
  -- elle ferme les anciens rayons en meme temps. Tant qu'aucun n'est ferme,
  -- rien ne doit etre en ligne.
  if not exists (
    select 1 from public.categories
    where external_ref like 'V2-%' and status = 'archived'
  ) then
    perform tests_assert(
      v_publiees_v2 = 0,
      format('%s carte(s) V2 sont publiees : le lot doit installer en brouillon.', v_publiees_v2));
  end if;

  -- Le catalogue anterieur ne doit pas avoir ete efface. Apres la fusion,
  -- ses commandes image sont toujours publiees — deplacees, pas remplacees.
  perform tests_assert(
    (select count(*) from public.prompts
     where status = 'published' and external_ref not like 'V2-%') > 0,
    'Plus aucune commande anterieure n''est publiee : le catalogue en ligne a ete efface.');
end $$;

-- --- Aucune carte orpheline, aucun texte manquant ------------------------
do $$
declare
  v_v2 integer;
  v_sans_collection integer;
  v_sans_payload integer;
  v_trop_de_champs integer;
  v_claude_sur_image integer;
begin
  select count(*) into v_v2 from public.prompts where external_ref like 'V2-%';
  if v_v2 = 0 then return; end if;

  select count(*) into v_sans_collection
  from public.prompts where external_ref like 'V2-%' and category_id is null;
  perform tests_assert(v_sans_collection = 0,
    format('%s carte(s) V2 sans collection.', v_sans_collection));

  select count(*) into v_sans_payload
  from public.prompts p where p.external_ref like 'V2-%'
    and not exists (
      select 1 from public.prompt_variants v
      join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
      where v.prompt_id = p.id);
  perform tests_assert(v_sans_payload = 0,
    format('%s carte(s) V2 sans texte a copier.', v_sans_payload));

  -- La fiche n'est pas un questionnaire : trois informations au plus.
  select count(*) into v_trop_de_champs from (
    select prompt_id from public.prompt_fields pf
    join public.prompts p on p.id = pf.prompt_id
    where p.external_ref like 'V2-%'
    group by prompt_id having count(*) > 3) x;
  perform tests_assert(v_trop_de_champs = 0,
    format('%s carte(s) V2 demandent plus de trois informations.', v_trop_de_champs));

  -- Le referentiel est formel : pas de payload Claude sur les Images en V2.
  -- Lui en fabriquer un reviendrait a promettre une compatibilite que le
  -- catalogue ne declare pas.
  select count(*) into v_claude_sur_image
  from public.prompts p
  join public.prompt_variants v on v.prompt_id = p.id
  join public.ai_providers f on f.id = v.provider_id and f.key = 'claude'
  where p.external_ref like 'V2-%' and p.library = 'images';
  perform tests_assert(v_claude_sur_image = 0,
    format('%s carte(s) Images portent une variante Claude.', v_claude_sur_image));
end $$;

rollback;
