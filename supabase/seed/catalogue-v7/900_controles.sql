-- =====================================================================
-- Catalogue v7 / 900 — controles de sortie
--
-- Chaque garantie de CLAUDE.md, verifiee sur la base telle qu'elle sortira.
-- Un seul echec et la transaction entiere est annulee.
-- =====================================================================
do $ctrl$
declare v_n integer;
begin
  -- Les 1109 cartes du kit, par leur identite, publiees, avec leur code.
  select count(*) into v_n from v7_carte k
  join public.prompts p on p.card_id = k.card_id and p.card_code = k.card_code and p.status = 'published';
  if v_n <> 1109 then raise exception 'Controle v7 : % cartes du kit publiees sur 1109.', v_n; end if;

  -- Chacune sert exactement le texte du kit.
  select count(*) into v_n from v7_carte k
  join public.prompts p on p.card_id = k.card_id
  where md5(coalesce((select pv.payload from public.prompt_versions pv
                       join public.prompt_variants v on v.id = pv.variant_id
                       join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
                      where v.prompt_id = p.id and pv.is_current), '')) <> k.payload_md5
     or public.variante_servie(p.id, null) is distinct from (
          select v.id from public.prompt_variants v join public.ai_providers a on a.id = v.provider_id
          where v.prompt_id = p.id and a.key = 'universel');
  if v_n > 0 then raise exception 'Controle v7 : % carte(s) ne servent pas le texte du kit.', v_n; end if;
  if exists (select 1 from public.prompts where status = 'published' and not payload_ready) then
    raise exception 'Controle v7 : une carte publiee n''a pas de texte a copier.';
  end if;

  -- Champs et tags.
  if (select count(*) from public.prompt_fields f join public.prompts p on p.id = f.prompt_id
      join v7_carte k on k.card_id = p.card_id) <> 1335 then
    raise exception 'Controle v7 : les champs des cartes ne sont pas ceux du kit.';
  end if;
  if (select count(*) from public.prompt_tags pt join public.prompts p on p.id = pt.prompt_id
      join v7_carte k on k.card_id = p.card_id) <> 3121 then
    raise exception 'Controle v7 : les tags des cartes ne sont pas ceux du kit.';
  end if;
  if (select count(*) from public.tags) <> (select count(*) from v7_tag)
     or exists (select 1 from public.tags where coalesce(btrim(description), '') = '') then
    raise exception 'Controle v7 : la taxonomie des tags n''est pas celle du kit.';
  end if;
  if exists (select 1 from public.prompts p where p.status <> 'archived'
             and (select count(*) from public.prompt_fields f where f.prompt_id = p.id)
                 > case when p.regime_champs = 'marketing' then 4 else 3 end) then
    raise exception 'Controle v7 : une carte depasse sa borne de champs.';
  end if;

  -- Plus d'archive, plus d'orphelin.
  if exists (select 1 from public.prompts where status = 'archived')
     or exists (select 1 from public.prompt_variants where status = 'archived') then
    raise exception 'Controle v7 : une archive subsiste.';
  end if;
  if exists (select 1 from public.prompt_field_choices ch
             where not exists (select 1 from public.prompt_fields f where f.id = ch.field_id)) then
    raise exception 'Controle v7 : choix de champ orphelin.';
  end if;

  -- Identite et unicite.
  if exists (select 1 from public.prompts where card_id is null or card_code is null) then
    raise exception 'Controle v7 : une carte sans card_id ou sans code.';
  end if;
  if exists (select slug from public.prompts group by slug having count(*) > 1) then
    raise exception 'Controle v7 : un slug en double dans le catalogue.';
  end if;

  -- Brouillons : ceux du registre, et eux seuls.
  if (select count(*) from public.prompts p join v7_brouillon b on b.card_id = p.card_id
      where p.status = 'draft') <> (select count(*) from v7_brouillon)
     or (select count(*) from public.prompts where status = 'draft') <> (select count(*) from v7_brouillon) then
    raise exception 'Controle v7 : les brouillons ne sont pas ceux du registre.';
  end if;

  -- Rangement : aucune collection visible vide, rien de publie en transition.
  if exists (select 1 from public.categories c where c.parent_id is not null and c.is_visible
             and not exists (select 1 from public.prompts p where p.category_id = c.id)) then
    raise exception 'Controle v7 : une collection visible est vide : %',
      (select string_agg(c.name, ', ') from public.categories c where c.parent_id is not null and c.is_visible
        and not exists (select 1 from public.prompts p where p.category_id = c.id));
  end if;
  if exists (select 1 from public.prompts p join public.categories c on c.id = p.category_id
             where c.external_ref = 'V5-TRANSITION' and p.status = 'published') then
    raise exception 'Controle v7 : une carte publiee attend encore en transition.';
  end if;

  -- Visuels intacts.
  if (select count(*) from public.prompt_media) <> (select n from v7_visuels_avant) then
    raise exception 'Controle v7 : des visuels ont disparu.';
  end if;
end $ctrl$;

select
  (select count(*) from public.prompts where status = 'published') as publiees,
  (select count(*) from public.prompts where status = 'draft') as brouillons,
  (select count(*) from public.prompts where status = 'archived') as archivees,
  (select count(*) from public.tags) as tags,
  (select count(*) from public.prompt_tags) as liens_de_tags,
  (select count(*) from public.prompt_fields) as champs,
  (select count(*) from public.categories where parent_id is not null and status <> 'archived') as collections,
  (select count(*) from public.prompt_media) as visuels,
  (select count(*) from public.copy_events) as copies_du_journal;
