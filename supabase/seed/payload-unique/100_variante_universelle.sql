-- =====================================================================
-- Lot payload-unique / 100 — la variante universelle des cartes V5
--
-- Chaque carte du catalogue V5 recoit une variante « universel » dont la
-- version courante porte le texte canonique. Ce texte n'est pas choisi :
-- les trois variantes par IA de ces 642 cartes portent deja le meme, et le
-- lot le verifie avant d'ecrire — s'il en trouvait deux differents pour une
-- meme carte, il leverait plutot que de trancher.
--
-- Rien n'est retire ici. Les variantes par IA restent publiees tant que
-- l'interface les liste ; elles s'archivent avec le selecteur.
--
-- Le lot cree aussi le fournisseur « universel », inactif : il ne
-- s'affiche dans aucune liste d'IA, il n'est qu'un porteur de texte. Tout
-- lot de catalogue ecrit apres celui-ci croise les fournisseurs ACTIFS
-- (`where ia.is_active`), faute de quoi il poserait des variantes
-- universelles vides.
--
-- Rejouable : une carte qui a deja sa variante universelle n'en recoit pas
-- une seconde, et une version identique n'est pas reecrite.
-- =====================================================================
begin;

insert into public.ai_providers (key, name, is_active, sort_order)
values ('universel', 'Toutes les IA', false, 0)
on conflict (key) do nothing;

create temporary table canon on commit drop as
select p.id as prompt_id,
       min(pv.payload) as payload,
       count(distinct pv.payload) as textes
from public.prompts p
join public.prompt_variants v on v.prompt_id = p.id
join public.ai_providers a on a.id = v.provider_id and a.key <> 'universel'
join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
where p.catalog_version = 'v5'
group by p.id;

do $ctrl$
begin
  if exists (select 1 from canon where textes > 1) then
    raise exception 'Lot payload-unique : % carte(s) portent des textes differents selon l''IA. Rien n''est ecrit ; les reconcilier d''abord.',
      (select count(*) from canon where textes > 1);
  end if;
  if exists (select 1 from canon where coalesce(btrim(payload), '') = '') then
    raise exception 'Lot payload-unique : une carte n''a aucun texte a porter.';
  end if;
end $ctrl$;

insert into public.prompt_variants (prompt_id, provider_id, status, compatibility)
select c.prompt_id, a.id, 'published', 'bon'
from canon c cross join public.ai_providers a
where a.key = 'universel'
on conflict (prompt_id, provider_id) do update set status = 'published', updated_at = now();

insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
select v.id, 'canonique', c.payload, 'published', true, now()
from canon c
join public.prompt_variants v on v.prompt_id = c.prompt_id
join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
where not exists (
  select 1 from public.prompt_versions x where x.variant_id = v.id and x.is_current
);

do $ctrl$
declare v_n integer;
begin
  select count(*) into v_n
  from canon c
  join public.prompt_variants v on v.prompt_id = c.prompt_id
  join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
  join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current and pv.status = 'published'
  where pv.payload = c.payload;
  if v_n <> (select count(*) from canon) then
    raise exception 'Lot payload-unique : % cartes servent le texte canonique sur % attendues.', v_n, (select count(*) from canon);
  end if;
end $ctrl$;

select 'cartes avec variante universelle' as quoi, count(*) as n from canon;
commit;
