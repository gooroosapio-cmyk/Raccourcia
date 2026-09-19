-- =====================================================================
-- Controle de completude du catalogue V2
--
-- Genere par scripts/generer-catalogue-v2.mjs. Ne pas modifier a la main :
-- la source est le CSV du catalogue V2, et une correction faite ici
-- disparaitrait a la prochaine generation.
-- =====================================================================

-- Ce lot ne modifie rien : il refuse si l'import n'est pas complet.
--
-- Un import a moitie passe est pire qu'un import refuse : la bibliotheque
-- parait remplie, et il manque cent commandes que personne ne cherchera.
do $controle$
declare
  v_cartes integer;
  v_commandes integer;
  v_collections integer;
  v_categories integer;
  v_sans_collection integer;
  v_sans_payload integer;
  v_publiees integer;
begin
  select count(*), count(distinct command_id)
  into v_cartes, v_commandes
  from public.prompts where external_ref like 'V2-%';

  select count(*) into v_categories from public.categories where external_ref like 'V2CAT-%';
  select count(*) into v_collections from public.categories where external_ref like 'V2COL-%';

  select count(*) into v_sans_collection
  from public.prompts where external_ref like 'V2-%' and category_id is null;

  select count(*) into v_sans_payload
  from public.prompts p
  where p.external_ref like 'V2-%'
    and not exists (
      select 1 from public.prompt_variants v
      join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
      where v.prompt_id = p.id);

  select count(*) into v_publiees
  from public.prompts where external_ref like 'V2-%' and status = 'published';

  if v_cartes <> 1010 then
    raise exception 'Catalogue V2 : % cartes importees au lieu de 1010.', v_cartes;
  end if;
  if v_categories <> 27 or v_collections <> 73 then
    raise exception 'Catalogue V2 : % categories et % collections au lieu de 27 et 73.',
      v_categories, v_collections;
  end if;
  if v_sans_collection > 0 then
    raise exception 'Catalogue V2 : % carte(s) sans collection.', v_sans_collection;
  end if;
  if v_sans_payload > 0 then
    raise exception 'Catalogue V2 : % carte(s) sans texte a copier.', v_sans_payload;
  end if;

  -- Le lot n'a rien publie, et il le verifie : ce qui est en ligne
  -- aujourd'hui doit continuer de l'etre, et le nouveau catalogue attend
  -- ses visuels avant de se montrer.
  if v_publiees > 0 then
    raise notice 'Catalogue V2 : % carte(s) deja publiee(s) — publication faite en administration.', v_publiees;
  end if;

  raise notice 'Catalogue V2 : % cartes, % commandes, % collections, % categories.',
    v_cartes, v_commandes, v_collections, v_categories;
end $controle$;