-- =====================================================================
-- Lot 417 — cartes 641 a 642 sur 642
--
-- 2 mises a jour sur une identite resolue, 0 creations.
--
-- Une mise a jour porte sur l'identifiant reel, jamais sur le slug : cet
-- import renomme des titres, et resoudre par slug marcherait au premier
-- passage pour echouer au second. Le slug existant est conserve tel quel,
-- ce qui preserve les adresses deja partagees.
--
-- Ce lot n'ecrit ni like_count, ni created_at, ni is_free, ni un seul media.
-- =====================================================================

begin;

create temporary table v5_lot (
  ref text, id uuid, commande text, titre text, slug text, card_slug text,
  description text, entrees text, sortie text, format_sortie text, ratio text,
  temoin text, mode text, library text, statut text, cat text,
  champs_max int, regime text, alias jsonb
) on commit drop;
insert into v5_lot select
  x ->> 'ref', nullif(x ->> 'id','')::uuid, x ->> 'commande', x ->> 'titre',
  x ->> 'slug', x ->> 'card_slug', x ->> 'description', x ->> 'entrees',
  x ->> 'sortie', x ->> 'format_sortie', x ->> 'ratio', x ->> 'temoin',
  x ->> 'mode', x ->> 'library', x ->> 'statut', x ->> 'cat',
  (x ->> 'champs_max')::int, x ->> 'regime', x -> 'alias'
from jsonb_array_elements($raccourcia$[{"ref":"rc5-assistants-design","id":"ae8cccd2-d9c2-4f82-8593-95de67d7ae53","commande":"/mode-design","titre":"Mode critique design","slug":null,"card_slug":"mode-critique-design","description":"Améliore une interface ou un visuel avec trois corrections prioritaires.","entrees":"Sujet ou objectif","sortie":"Échange court, puis synthèse des décisions en Markdown","format_sortie":"Markdown ; fichiers seulement si outil disponible","ratio":null,"temoin":"a_produire","mode":"texte","library":"reflexions","statut":"published","cat":"V5C-PERSONNAGES-RECUL","champs_max":2,"regime":"standard","alias":["/designcritic","/critique-design","/directeur-artistique","/redacteur-en-chef"]},{"ref":"rc5-assistants-histoire","id":"b74d7c62-8246-461d-aab7-c9b2f961f56d","commande":"/mode-histoire","titre":"Mode narrateur","slug":null,"card_slug":"mode-narrateur","description":"Prends du recul grâce à une narration calme suivie d’une action simple.","entrees":"Sujet ou objectif","sortie":"Échange court, puis synthèse des décisions en Markdown","format_sortie":"Markdown ; fichiers seulement si outil disponible","ratio":null,"temoin":"a_produire","mode":"texte","library":"reflexions","statut":"published","cat":"V5C-PERSONNAGES-PERSONNAGES","champs_max":1,"regime":"standard","alias":["/freemannarrator","/originalmentor","/oracle-pragmatique","/wednesdaydialogue"]}]$raccourcia$) x;

-- Les cartes resolues : mise a jour sur l'identifiant reel.
update public.prompts p set
  external_ref = l.ref, name = l.titre, short_description = l.description,
  command = l.commande, card_slug = l.card_slug,
  expected_input = l.entrees, expected_output = l.sortie,
  output_format = l.format_sortie, default_ratio = coalesce(l.ratio, p.default_ratio),
  witness_type = l.temoin, mode = l.mode::public.app_mode,
  library = l.library::public.app_library, status = l.statut::public.content_status,
  category_id = (select id from public.categories c where c.external_ref = l.cat),
  fiche_champs_max = l.champs_max, regime_champs = l.regime, catalog_version = 'v5',
  aliases = coalesce((select array_agg(a) from jsonb_array_elements_text(l.alias) a), '{}'),
  published_at = case when l.statut = 'published' then coalesce(p.published_at, now()) else p.published_at end,
  revised_at = now(), updated_at = now()
from v5_lot l where p.id = l.id;

-- Les cartes neuves : rejouables par external_ref, qui est unique.
insert into public.prompts (
  external_ref, command, name, slug, card_slug, short_description, expected_input,
  expected_output, output_format, default_ratio, witness_type, mode, library,
  status, category_id, fiche_champs_max, regime_champs, catalog_version, aliases, revised_at)
select l.ref, l.commande, l.titre, l.slug, l.card_slug, l.description, l.entrees,
  l.sortie, l.format_sortie, l.ratio, l.temoin, l.mode::public.app_mode,
  l.library::public.app_library, l.statut::public.content_status,
  (select id from public.categories c where c.external_ref = l.cat),
  l.champs_max, l.regime, 'v5',
  coalesce((select array_agg(a) from jsonb_array_elements_text(l.alias) a), '{}'), now()
from v5_lot l where l.id is null
on conflict (external_ref) do update set
  name = excluded.name, short_description = excluded.short_description,
  expected_input = excluded.expected_input, expected_output = excluded.expected_output,
  category_id = excluded.category_id, status = excluded.status,
  fiche_champs_max = excluded.fiche_champs_max, regime_champs = excluded.regime_champs,
  revised_at = now(), updated_at = now();

do $ctrl$
begin
  if not ((select count(*) from public.prompts p join v5_lot l on l.ref = p.external_ref) = 2) then
    raise exception 'Lot 417 : les 2 cartes du lot ne sont pas toutes en base.';
  end if;
end $ctrl$;

do $ctrl$
begin
  if not (not exists (select 1 from public.prompts p join v5_lot l on l.ref = p.external_ref
            where p.category_id is null)) then
    raise exception 'Lot 417 : une carte est rattachee a aucun rayon. L''import s''arrete.';
  end if;
end $ctrl$;

commit;
