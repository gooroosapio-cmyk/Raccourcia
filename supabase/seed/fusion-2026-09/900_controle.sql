-- =====================================================================
-- Controle de la fusion
--
-- Ce lot ne modifie rien : il refuse si la fusion n'a pas abouti. Une
-- fusion a moitie faite est pire qu'une fusion refusee — la bibliotheque
-- parait rangee, et deux cents commandes sont introuvables.
-- =====================================================================

do $controle$
declare
  v_orphelines integer;
  v_hors_arbre integer;
  v_sans_payload integer;
  v_v2_brouillon integer;
  v_publiees integer;
  v_visuels integer;
begin
  -- Aucune commande publiee sans collection. Bornee aux deux catalogues :
  -- une base de recette porte aussi des lignes posees a la main, qui ne
  -- relevent pas de cette fusion.
  select count(*) into v_orphelines
  from public.prompts
  where status = 'published' and category_id is null
    and (external_ref like 'V2-%' or card_id is not null);
  if v_orphelines > 0 then
    raise exception 'Fusion : % commande(s) publiee(s) sans collection.', v_orphelines;
  end if;

  -- Aucune commande publiee ne reste dans l'ancienne arborescence.
  select count(*) into v_hors_arbre
  from public.prompts p
  join public.categories c on c.id = p.category_id
  where p.status = 'published' and c.external_ref like 'V2-%';
  if v_hors_arbre > 0 then
    raise exception 'Fusion : % commande(s) publiee(s) encore dans l''ancienne arborescence.', v_hors_arbre;
  end if;

  -- Rien de publie sans texte a copier : le bouton echouerait sans raison
  -- visible.
  select count(*) into v_sans_payload
  from public.prompts p
  where p.status = 'published'
    and (p.external_ref like 'V2-%' or p.card_id is not null)
    and not exists (
      select 1 from public.prompt_variants v
      join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
      where v.prompt_id = p.id);
  if v_sans_payload > 0 then
    raise exception 'Fusion : % commande(s) publiee(s) sans texte a copier.', v_sans_payload;
  end if;

  select count(*) into v_v2_brouillon
  from public.prompts where external_ref like 'V2-%' and status = 'draft';

  select count(*) into v_publiees from public.prompts where status = 'published';
  select count(*) into v_visuels from public.prompts where status = 'published' and media_ready;

  if v_v2_brouillon > 0 then
    raise notice 'Fusion : % carte(s) V2 restent en brouillon.', v_v2_brouillon;
  end if;

  raise notice 'Fusion : % commande(s) publiee(s), dont % avec un visuel.', v_publiees, v_visuels;
end $controle$;
