-- Catalogue v7 / 300 — les collections que le kit ajoute. Les autres existent
-- deja sous le meme libelle ; « Amenagements », que le kit annonce comme
-- creee, existe aussi.
insert into public.categories (parent_id, mode, slug, name, short_description, status, sort_order, external_ref)
select r.id, r.mode, x ->> 'slug', x ->> 'nom', x ->> 'description', 'published', (x ->> 'ordre')::int, x ->> 'ref'
from jsonb_array_elements($raccourcia_v7$[{"ref": "V5C-PORTRAITS-VOYAGES", "slug": "v5-portraits--voyages", "rayon": "V5-PORTRAITS", "nom": "Voyages & horizons", "ordre": 360, "description": null}, {"ref": "V5C-PRODUITS-SCENOGRAPHIES", "slug": "v5-produits--scenographies", "rayon": "V5-PRODUITS", "nom": "Scénographies", "ordre": 370, "description": null}, {"ref": "V5C-PRODUITS-MATIERES", "slug": "v5-produits--matieres", "rayon": "V5-PRODUITS", "nom": "Matières & conception", "ordre": 380, "description": "Études de matières, finitions et choix de conception."}, {"ref": "V5C-MARKETING-PRESENTATIONS", "slug": "v5-marketing--presentations", "rayon": "V5-MARKETING", "nom": "Présentations professionnelles", "ordre": 390, "description": "Supports visuels pour exposer une offre, un projet ou une décision."}]$raccourcia_v7$::jsonb) x
join public.categories r on r.external_ref = x ->> 'rayon'
on conflict (slug) do nothing;

-- Chaque carte du kit trouve sa collection, sous son rayon.
create temporary table v7_collection on commit drop as
select distinct k.collection, k.rayon_ref, c.id as category_id
from v7_carte k
join public.categories r on r.external_ref = k.rayon_ref
left join public.categories c on c.parent_id = r.id and c.name = k.collection and c.status <> 'archived';

do $ctrl$
begin
  if exists (select 1 from v7_collection where category_id is null) then
    raise exception 'Catalogue v7 : collection(s) du kit introuvable(s) : %',
      (select string_agg(collection, ', ') from v7_collection where category_id is null);
  end if;
end $ctrl$;
