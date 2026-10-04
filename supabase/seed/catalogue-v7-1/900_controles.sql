-- =====================================================================
-- Catalogue v7.1 / 900 — controles de sortie. Un echec annule tout.
-- =====================================================================
do $ctrl$
declare v_n integer;
begin
  select count(*) into v_n from v71_carte k
  join public.prompts p on p.card_id = k.card_id and p.card_code = k.card_code and p.status = 'published';
  if v_n <> 200 then raise exception 'Controle v7.1 : % cartes publiees sur 200.', v_n; end if;

  select count(*) into v_n from v71_carte k
  join public.prompts p on p.card_id = k.card_id
  where md5(coalesce((select pv.payload from public.prompt_versions pv
                       join public.prompt_variants v on v.id = pv.variant_id
                       join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
                      where v.prompt_id = p.id and pv.is_current), '')) <> k.payload_md5
     or not p.payload_ready;
  if v_n > 0 then raise exception 'Controle v7.1 : % carte(s) ne servent pas leur texte.', v_n; end if;

  if (select count(*) from public.prompt_fields f join public.prompts p on p.id = f.prompt_id
      join v71_carte k on k.card_id = p.card_id) <> 614 then
    raise exception 'Controle v7.1 : les champs ne sont pas ceux attendus.';
  end if;
  if (select count(*) from public.prompt_tags pt join public.prompts p on p.id = pt.prompt_id
      join v71_carte k on k.card_id = p.card_id) <> 618 then
    raise exception 'Controle v7.1 : les tags ne sont pas ceux du fichier.';
  end if;
  if exists (select 1 from public.prompts p where p.status <> 'archived'
             and (select count(*) from public.prompt_fields f where f.prompt_id = p.id)
                 > case when p.regime_champs = 'marketing' then 4 else 3 end) then
    raise exception 'Controle v7.1 : une carte depasse sa borne de champs.';
  end if;

  -- Rien d'existant n'a bouge : seules des cartes se sont ajoutees.
  if (select count(*) from public.prompt_media) <> (select visuels from v71_avant)
     or (select count(*) from public.tags) <> (select tags from v71_avant)
     or (select count(*) from public.categories) <> (select rangements from v71_avant)
     or (select count(*) from public.prompts)
        <> (select cartes + 200 - deja_presentes from v71_avant) then
    raise exception 'Controle v7.1 : le lot a touche autre chose que ses cartes.';
  end if;
  if exists (select slug from public.prompts group by slug having count(*) > 1) then
    raise exception 'Controle v7.1 : un slug en double dans le catalogue.';
  end if;
end $ctrl$;

select
  (select count(*) from public.prompts where status = 'published') as publiees,
  (select count(*) from public.prompts where status = 'draft') as brouillons,
  (select count(*) from v71_carte k join public.prompts p on p.card_id = k.card_id) as cartes_du_lot,
  (select count(*) from public.prompt_media) as visuels;
