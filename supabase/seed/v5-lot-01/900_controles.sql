-- =====================================================================
-- Catalogue V5 — lot 01, controles
--
-- Le lot est refuse s'il n'a pas produit exactement ce que le classeur
-- annonce. Un import partiel qui se tait est pire qu'un import qui echoue :
-- c'est ce silence qui avait laisse 99 raccourcis en arriere en V2.
-- =====================================================================

do $$
declare
  v_refs text[] := array['RCI-IMG-001','RCI-IMG-002','RCI-IMG-003','RCI-IMG-004','RCI-IMG-005','RCI-IMG-006','RCI-IMG-007','RCI-IMG-008','RCI-IMG-009','RCI-IMG-010','RCI-IMG-044','RCI-IMG-045','RCI-IMG-046','RCI-IMG-047','RCI-IMG-048','RCI-IMG-049','RCI-IMG-091','RCI-IMG-092','RCI-IMG-093','RCI-IMG-094','RCI-IMG-095','RCI-IMG-111','RCI-IMG-112','RCI-IMG-113','RCI-IMG-114','RCI-IMG-115','RCI-IMG-135','RCI-IMG-136','RCI-IMG-148','RCI-IMG-133','RCI-IMG-143','RCI-IMG-147','RCI-IMG-149','RCI-IMG-134','RCI-IMG-146','RCI-IMG-139','RCI-IMG-140','RCI-IMG-145','RCI-IMG-142','RCI-IMG-137','RCI-IMG-138','RCI-IMG-144','RCI-IMG-150','RCI-IMG-131','RCI-IMG-132','RCI-IMG-141'];
  v_courantes integer;
  v_distinctes integer;
  v_empreinte text;
begin
  -- 1. Trois versions courantes par commande, une par moteur.
  select count(*) into v_courantes
  from public.prompts p
  join public.prompt_variants v on v.prompt_id = p.id
  join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
  where p.external_ref = any(v_refs);

  if v_courantes <> 138 then
    raise exception 'Versions courantes : % au lieu de 138.', v_courantes;
  end if;

  -- 2. Les trois moteurs doivent porter des textes differents : c'est tout
  --    l'objet de ce lot. Trois textes identiques signifieraient que rien
  --    n'a ete applique.
  select count(*) into v_distinctes
  from (
    select p.id
    from public.prompts p
    join public.prompt_variants v on v.prompt_id = p.id
    join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
    where p.external_ref = any(v_refs)
    group by p.id
    having count(distinct pv.payload) = 3
  ) x;

  if v_distinctes <> 46 then
    raise exception 'Commandes a trois textes distincts : % au lieu de 46.', v_distinctes;
  end if;

  -- 3. Le contenu lui-meme, empreinte par empreinte. Comparer les comptes
  --    ne dirait pas si le bon texte est alle au bon moteur.
  select md5(string_agg(x.ligne, ',' order by x.ligne)) into v_empreinte
  from (
    select p.external_ref || ':' || pr.key || ':' ||
           encode(extensions.digest(convert_to(pv.payload, 'UTF8'), 'sha256'), 'hex') as ligne
    from public.prompts p
    join public.prompt_variants v on v.prompt_id = p.id
    join public.ai_providers pr on pr.id = v.provider_id
    join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
    where p.external_ref = any(v_refs)
  ) x;

  if v_empreinte <> 'c73b4f8b10346e26401395711a49f6fa' then
    raise exception 'Contenu different de celui du classeur (empreinte %).', v_empreinte;
  end if;

  raise notice 'V5 lot 01 : 46 commandes, 138 payloads par moteur, contenu conforme au classeur.';
end;
$$;
