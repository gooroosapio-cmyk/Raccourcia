-- =====================================================================
-- Un payload canonique par commande
--
-- Ce que ce fichier verrouille :
--
--   * une commande qui a sa variante universelle sert CE texte, quelle que
--     soit l'IA demandee — y compris une IA pour laquelle aucune variante
--     n'existe : c'est la fin du « texte adapte a l'IA choisie » ;
--   * l'IA demandee reste inscrite au journal des copies ;
--   * le fournisseur universel n'est pas une IA : il est inactif, donc
--     absent de toute liste d'IA ;
--   * une variante universelle vide refuse, elle ne retombe pas en silence
--     sur un texte par IA — ce serait servir l'ancien texte sans le dire ;
--   * la copie offerte suit la meme regle.
--
-- La commande d1 des fixtures n'a qu'une variante ChatGPT ; on lui donne
-- sa variante universelle, avec un texte distinct pour voir lequel sort.
-- =====================================================================
begin;

-- Le fournisseur vient du lot payload-unique ; le test ne suppose pas
-- qu'il a tourne.
insert into public.ai_providers (key, name, is_active, sort_order)
values ('universel', 'Toutes les IA', false, 0)
on conflict (key) do nothing;

do $$
declare v_variant uuid;
begin
  insert into public.prompt_variants (prompt_id, provider_id, status, compatibility)
  select '00000000-0000-0000-0000-0000000000d1', id, 'published', 'bon'
  from public.ai_providers where key = 'universel'
  returning id into v_variant;

  insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
  values (v_variant, 'canonique', '[CANONIQUE] texte unique', 'published', true, now());

  perform tests_assert(
    not (select is_active from public.ai_providers where key = 'universel'),
    'Le fournisseur universel est actif : il apparaitrait comme une quatrieme IA.');
end $$;

select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');

do $$
declare v_payload text; v_ia text;
begin
  -- Claude n'a aucune variante pour d1 : autrefois un refus, desormais le
  -- texte canonique.
  select payload into v_payload
  from public.resolve_prompt('00000000-0000-0000-0000-0000000000d1', 'claude');
  perform tests_assert(v_payload = '[CANONIQUE] texte unique',
    format('Claude recoit « %s » au lieu du texte canonique.', v_payload));

  select payload into v_payload
  from public.resolve_prompt('00000000-0000-0000-0000-0000000000d1', 'chatgpt');
  perform tests_assert(v_payload = '[CANONIQUE] texte unique',
    'ChatGPT recoit encore son ancien texte alors qu''un texte canonique existe.');

  select provider_key into v_ia from public.copy_events
  where user_id = '00000000-0000-0000-0000-0000000000a1'
    and prompt_id = '00000000-0000-0000-0000-0000000000d1'
  order by created_at desc limit 1;
  perform tests_assert(v_ia is not null, 'L''IA demandee n''est plus inscrite au journal.');
end $$;

reset role;

-- Une variante universelle videe refuse, sans retomber sur l'ancien texte.
update public.prompt_versions pv set payload = '   '
from public.prompt_variants v join public.ai_providers a on a.id = v.provider_id
where pv.variant_id = v.id and a.key = 'universel'
  and v.prompt_id = '00000000-0000-0000-0000-0000000000d1';

select tests_login('00000000-0000-0000-0000-0000000000a1',
                   '00000000-0000-0000-0000-0000000000f1');
do $$
begin
  begin
    perform public.resolve_prompt('00000000-0000-0000-0000-0000000000d1', 'chatgpt');
    perform tests_assert(false,
      'Un texte canonique vide a laisse passer l''ancien texte ChatGPT sans rien dire.');
  exception when sqlstate '42501' then null;
  end;
end $$;
reset role;

-- La copie offerte suit la meme regle.
do $$
declare v_variant uuid;
begin
  insert into public.prompt_variants (prompt_id, provider_id, status, compatibility)
  select '00000000-0000-0000-0000-0000000000d2', id, 'published', 'bon'
  from public.ai_providers where key = 'universel'
  returning id into v_variant;
  insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
  values (v_variant, 'canonique', '[CANONIQUE] offert', 'published', true, now());
end $$;

select tests_logout();
do $$
declare v_payload text;
begin
  select payload into v_payload
  from public.resolve_free_prompt('00000000-0000-0000-0000-0000000000d2', 'gemini');
  perform tests_assert(v_payload = '[CANONIQUE] offert',
    format('La copie offerte sert « %s » au lieu du texte canonique.', v_payload));
end $$;
reset role;

rollback;
