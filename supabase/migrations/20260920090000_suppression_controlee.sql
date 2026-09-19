-- =====================================================================
-- La suppression definitive, et ce qu'elle emporte
--
-- Jusqu'ici l'administration ne savait qu'archiver. C'etait la bonne
-- valeur par defaut et elle le reste : archiver conserve la ligne, ses
-- relations et son identifiant, et se defait d'un geste. Mais une refonte
-- de taxonomie laisse derriere elle des rayons vides, des tags poses par
-- erreur et des commandes qui n'auraient jamais du entrer — et il n'y avait
-- aucun moyen de s'en debarrasser (RaccourcIA V3, partie XII).
--
-- CE QUE CES FONCTIONS GARANTISSENT :
--
--   * On sait d'avance ce qu'on detruit. Chaque suppression a son apercu,
--     qui compte ce qui partira avec. Une confirmation sans bilan n'est
--     qu'un clic de plus.
--   * Aucun orphelin. Les cascades de la base emportent les relations ; ce
--     qu'elles n'emportent pas — les fichiers du stockage, les commandes
--     d'un rayon supprime — est soit rendu a l'appelant, soit reaffecte.
--   * Aucune destruction silencieuse. Une commande qui sert de destination
--     a d'anciens liens ne part pas sans qu'on le dise ; un rayon qui porte
--     encore des commandes exige de dire ou elles vont.
--   * Tout est journalise, avec l'etat d'avant. `admin_audit_logs` garde la
--     trace de ce qui a disparu, et c'est la seule chose qui en reste.
--
-- `security definer` et `is_admin()` en premiere ligne, comme toutes les
-- fonctions d'administration. Aucune politique n'est contournee ni
-- assouplie : ces fonctions ajoutent un geste, elles n'ouvrent pas la base.
--
-- Rejouable : `create or replace` seul.
-- =====================================================================

-- --- Ce qu'une suppression de commande emporterait -----------------------
create or replace function public.admin_apercu_suppression_commande(p_prompt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_apercu jsonb;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'commande', p.command,
    'nom', p.name,
    'statut', p.status::text,
    'visuels', (select count(*) from public.prompt_media m where m.prompt_id = p.id),
    'variantes', (select count(*) from public.prompt_variants v where v.prompt_id = p.id),
    'versions', (
      select count(*) from public.prompt_variants v
      join public.prompt_versions pv on pv.variant_id = v.id
      where v.prompt_id = p.id),
    'favoris', (select count(*) from public.favorites f where f.prompt_id = p.id),
    'likes', p.like_count,
    'tags', (select count(*) from public.prompt_tags pt where pt.prompt_id = p.id),
    'champs', (select count(*) from public.prompt_fields pf where pf.prompt_id = p.id),
    -- Les anciens liens qui menent ici. `prompt_aliases` refuse la
    -- suppression de leur destination : sans ce compte, l'administration
    -- se heurterait a une erreur de cle etrangere sans savoir pourquoi.
    'liens_anciens', (
      select count(*) from public.prompt_aliases a where a.canonical_prompt_id = p.id)
  )
  into v_apercu
  from public.prompts p
  where p.id = p_prompt_id;

  if v_apercu is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_apercu;
end;
$$;

revoke all on function public.admin_apercu_suppression_commande(uuid) from public, anon;
grant execute on function public.admin_apercu_suppression_commande(uuid) to authenticated;

-- --- Supprimer une commande ---------------------------------------------
--
-- Les chemins de stockage sont rendus a l'appelant : la base ne sait pas
-- effacer un fichier du bucket, et les laisser derriere ferait grossir le
-- stockage d'images que plus rien ne reference.
create or replace function public.admin_supprimer_commande(
  p_prompt_id uuid,
  -- Vrai pour emporter aussi les anciens liens qui menent ici. Ils cessent
  -- alors de fonctionner : c'est une decision, pas un detail.
  p_emporter_les_liens boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_apercu jsonb;
  v_chemins text[];
  v_liens integer;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_apercu := public.admin_apercu_suppression_commande(p_prompt_id);

  v_liens := (v_apercu ->> 'liens_anciens')::int;
  if v_liens > 0 and not p_emporter_les_liens then
    raise exception 'LIENS_ANCIENS:%', v_liens using errcode = '23503';
  end if;

  select coalesce(array_agg(m.storage_path), array[]::text[])
  into v_chemins
  from public.prompt_media m
  where m.prompt_id = p_prompt_id;

  -- Le journal d'abord : apres la suppression, plus rien ne permettrait de
  -- dire ce qui a disparu.
  perform public.admin_log(
    'raccourci.suppression', 'prompt', p_prompt_id, v_apercu, null);

  if p_emporter_les_liens then
    delete from public.prompt_aliases where canonical_prompt_id = p_prompt_id;
  end if;

  -- Tout le reste part en cascade : variantes et versions, visuels,
  -- questions, favoris, likes, tags, champs et leurs choix.
  delete from public.prompts where id = p_prompt_id;

  return jsonb_build_object('chemins', to_jsonb(v_chemins), 'apercu', v_apercu);
end;
$$;

revoke all on function public.admin_supprimer_commande(uuid, boolean) from public, anon;
grant execute on function public.admin_supprimer_commande(uuid, boolean) to authenticated;

-- --- Ce qu'une suppression de rayon emporterait --------------------------
create or replace function public.admin_apercu_suppression_categorie(p_category_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_apercu jsonb;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'nom', c.name,
    'slug', c.slug,
    'sous_rayons', (select count(*) from public.categories e where e.parent_id = c.id),
    -- Les commandes du rayon ET de ses sous-rayons : supprimer un parent
    -- emporte ses enfants, donc le bilan doit compter les deux.
    'commandes', (
      select count(*) from public.prompts p
      where p.category_id = c.id
         or p.category_id in (select e.id from public.categories e where e.parent_id = c.id))
  )
  into v_apercu
  from public.categories c
  where c.id = p_category_id;

  if v_apercu is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_apercu;
end;
$$;

revoke all on function public.admin_apercu_suppression_categorie(uuid) from public, anon;
grant execute on function public.admin_apercu_suppression_categorie(uuid) to authenticated;

-- --- Supprimer un rayon --------------------------------------------------
--
-- Un rayon qui porte encore des commandes ne se supprime pas sans dire ou
-- elles vont. `prompts.category_id` refuse d'ailleurs la suppression de sa
-- cible : sans reaffectation, l'operation echouerait sur une contrainte,
-- et l'administration n'y lirait rien d'utile.
--
-- La reaffectation ne peut pas etre le rayon supprime ni l'un de ses
-- sous-rayons : ils partent avec lui, et les commandes se retrouveraient
-- rangees dans le vide un instant plus tard.
create or replace function public.admin_supprimer_categorie(
  p_category_id uuid,
  p_reaffectation uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_apercu jsonb;
  v_commandes integer;
  v_enfants uuid[];
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_apercu := public.admin_apercu_suppression_categorie(p_category_id);
  v_commandes := (v_apercu ->> 'commandes')::int;

  select coalesce(array_agg(e.id), array[]::uuid[])
  into v_enfants
  from public.categories e
  where e.parent_id = p_category_id;

  if v_commandes > 0 then
    if p_reaffectation is null then
      raise exception 'REAFFECTATION_REQUISE:%', v_commandes using errcode = '23503';
    end if;

    if p_reaffectation = p_category_id or p_reaffectation = any (v_enfants) then
      raise exception 'REAFFECTATION_INVALIDE' using errcode = '22023';
    end if;

    if not exists (select 1 from public.categories c where c.id = p_reaffectation) then
      raise exception 'REAFFECTATION_INCONNUE' using errcode = 'P0002';
    end if;

    update public.prompts
    set category_id = p_reaffectation, updated_by = (select auth.uid())
    where category_id = p_category_id or category_id = any (v_enfants);
  end if;

  perform public.admin_log(
    'categorie.suppression', 'category', p_category_id,
    v_apercu,
    case when p_reaffectation is null then null
         else jsonb_build_object('reaffecte_vers', p_reaffectation) end);

  -- Les sous-rayons d'abord : `categories.parent_id` refuse aussi la
  -- suppression de sa cible.
  delete from public.categories where parent_id = p_category_id;
  delete from public.categories where id = p_category_id;

  return v_apercu;
end;
$$;

revoke all on function public.admin_supprimer_categorie(uuid, uuid) from public, anon;
grant execute on function public.admin_supprimer_categorie(uuid, uuid) to authenticated;

-- --- Supprimer un tag ----------------------------------------------------
--
-- Le moins lourd des trois : un tag ne porte rien, il qualifie. Le
-- supprimer retire ses associations et rien d'autre — aucune commande ne
-- disparait. Le bilan dit quand meme combien en perdent une etiquette,
-- parce que c'est ce qui change pour les membres.
create or replace function public.admin_supprimer_tag(p_tag_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_apercu jsonb;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'nom', t.name,
    'slug', t.slug,
    'groupe', t.groupe::text,
    'commandes', (select count(*) from public.prompt_tags pt where pt.tag_id = t.id)
  )
  into v_apercu
  from public.tags t
  where t.id = p_tag_id;

  if v_apercu is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  perform public.admin_log('tag.suppression', 'tag', p_tag_id, v_apercu, null);

  -- Les associations partent en cascade avec le tag.
  delete from public.tags where id = p_tag_id;

  return v_apercu;
end;
$$;

revoke all on function public.admin_supprimer_tag(uuid) from public, anon;
grant execute on function public.admin_supprimer_tag(uuid) to authenticated;

-- --- Les tags, vus de l'administration -----------------------------------
--
-- Tous, y compris ceux que personne ne porte et ceux qui sont desactives :
-- c'est precisement ceux-la qu'on vient regler. La lecture publique, elle,
-- n'en montre que les vivants.
create or replace function public.admin_liste_tags()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', id, 'slug', slug, 'nom', nom, 'groupe', groupe,
          'description', description, 'image', image, 'actif', actif,
          'ordre', ordre, 'total', total, 'publiees', publiees)
        order by rang, nom),
      '[]'::jsonb)
    from (
      select t.id, t.slug, t.name as nom, t.groupe::text as groupe,
             t.description, t.image_path as image, t.is_active as actif,
             t.sort_order as ordre,
             array_position(enum_range(null::public.tag_group), t.groupe) as rang,
             (select count(*) from public.prompt_tags pt where pt.tag_id = t.id)::int as total,
             (select count(*) from public.prompt_tags pt
                join public.prompts p on p.id = pt.prompt_id
              where pt.tag_id = t.id and p.status = 'published')::int as publiees
      from public.tags t
    ) s
  );
end;
$$;

revoke all on function public.admin_liste_tags() from public, anon;
grant execute on function public.admin_liste_tags() to authenticated;

do $rapport$
begin
  raise notice 'Suppression controlee : apercus et suppressions en place pour commandes, rayons et tags.';
end $rapport$;
