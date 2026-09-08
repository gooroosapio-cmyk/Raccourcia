-- =====================================================================
-- Catalogue V3 — payloads existants, lot 6
--
-- Seul le payload change. Le raccourci garde son identifiant, donc ses
-- favoris, son historique et ses visuels restent attaches. L'ancienne
-- version n'est pas supprimee : elle sort simplement du courant.
-- =====================================================================

drop table if exists lot_v3;
create temporary table lot_v3 as
select d.r as external_ref, public.import_v3_payload(d.l) as payload
from jsonb_to_recordset($raccourcia$[{"r":"RCI-TXT-180","l":[2506,1,2,2507,1511,1,5,2508,2509,1,8,1514,1515,11,1516,1517,1,14,2510,506,1,1518,1519,1520,1521,1522,1523,1,1524,2415,1526,1527,1,23,1528,1529,1530,1,27,1531,1532,1533]},{"r":"RCI-TXT-181","l":[2511,1,2,2512,1511,1,5,2513,2514,1,8,1514,1515,11,1516,1517,1,14,2515,2516,506,1,1518,1519,1520,1521,1522,1523,1,1524,2415,1526,1527,1,23,1528,1529,1530,1,27,1531,1532,1533]},{"r":"RCI-TXT-182","l":[2517,1,2,2518,1511,1,5,2519,2520,1,8,1514,1515,11,1516,1517,1,14,450,2521,506,1,1518,1519,1520,1521,1522,1523,1,1524,2415,1526,1527,1,23,1528,1529,1530,1,27,1531,1532,1533]},{"r":"RCI-TXT-183","l":[2522,1,2,2523,1511,1,5,2524,2525,1,8,1514,1515,11,1516,1517,1,14,1982,2526,506,1,1518,1519,1520,1521,1522,1523,1,1524,2415,1526,1527,1,23,1528,1529,1530,1,27,1531,1532,1533]},{"r":"RCI-TXT-184","l":[2527,1,2,2528,1511,1,5,2529,2530,1,8,1514,1515,11,1516,1517,1,14,1538,2531,506,1,1518,1519,1520,1521,1522,1523,1,1524,2415,1526,1527,1,23,1528,1529,1530,1,27,1531,1532,1533]},{"r":"RCI-TXT-185","l":[2532,1,2,2533,1511,1,5,2534,2535,1,8,1514,1515,11,1516,1517,1,14,235,180,506,1,1518,1519,1520,1521,1522,1523,1,1524,2415,1526,1527,1,23,1528,1529,1530,1,27,1531,1532,1533]},{"r":"RCI-TXT-186","l":[2536,1,2,2537,1511,1,5,2538,2539,1,8,1514,1515,11,1516,1517,1,14,2540,506,1544,1,1518,1519,1520,1521,1522,1523,1,1524,2415,1526,1527,1,23,1528,1529,1530,1,27,1531,1532,1533]},{"r":"RCI-TXT-187","l":[2541,1,2,2542,1511,1,5,2543,2544,1,8,1514,1515,11,1516,1517,1,14,2545,2455,1544,1,1518,1519,1520,1521,1522,1523,1,1524,2415,1526,1527,1,23,1528,1529,1530,1,27,1531,1532,1533]},{"r":"RCI-TXT-188","l":[2546,1,2,2547,1511,1,5,2548,2549,1,8,1514,1515,11,1516,1517,1,14,433,506,1,1518,1519,1520,1521,1522,1523,1,1524,2415,1526,1527,1,23,1528,1529,1530,1,27,1531,1532,1533]},{"r":"RCI-TXT-189","l":[2550,1,2,2551,1511,1,5,2552,2553,1,8,1514,1515,11,1516,1517,1,14,2414,180,1544,1,1518,1519,1520,1521,1522,1523,1,1524,2415,1526,1527,1,23,1528,1529,1530,1,27,1531,1532,1533]}]$raccourcia$::jsonb) as d(r text, l integer[]);

do $ctrl$
declare n integer;
begin
  select count(*) into n from lot_v3 where payload is null;
  if n > 0 then raise exception '% payloads incomplets : dictionnaire non charge.', n; end if;
end $ctrl$;

-- 1. L'ancienne version courante sort du courant si le texte a change.
update public.prompt_versions pv
set is_current = false, status = 'retired'::public.version_status
from lot_v3 l
join public.prompts p on p.external_ref = l.external_ref
join public.prompt_variants v on v.prompt_id = p.id
where pv.variant_id = v.id and pv.is_current and pv.payload is distinct from l.payload;

-- 2. Le payload V3 devient la version courante des trois variantes.
insert into public.prompt_versions (variant_id, version_label, payload, status, is_current, published_at)
select v.id, 'v3.0', l.payload, 'published'::public.version_status, true, now()
from lot_v3 l
join public.prompts p on p.external_ref = l.external_ref
join public.prompt_variants v on v.prompt_id = p.id
where not exists (
  select 1 from public.prompt_versions pv where pv.variant_id = v.id and pv.payload = l.payload);

-- 3. Un texte identique deja archive redevient simplement le courant.
update public.prompt_versions pv
set is_current = true, status = 'published'::public.version_status
from lot_v3 l
join public.prompts p on p.external_ref = l.external_ref
join public.prompt_variants v on v.prompt_id = p.id
where pv.variant_id = v.id and pv.payload = l.payload and not pv.is_current
  and not exists (select 1 from public.prompt_versions a where a.variant_id = v.id and a.is_current);

-- Seule colonne editoriale touchee : celle qui dit d'ou vient le payload.
update public.prompts p
set catalog_version = 'v3.0', revised_at = date '2026-09-08'
from lot_v3 l where p.external_ref = l.external_ref;

drop table lot_v3;
