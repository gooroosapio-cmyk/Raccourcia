-- =====================================================================
-- Fermer ce que la fusion a vide
--
-- Les anciennes collections ont rendu leurs commandes ; leurs familles
-- n'ont plus de collection ouverte. Les laisser ouvertes donnerait une
-- Bibliotheque a deux arborescences, dont une vide — et une liste de
-- rangement en administration ou la moitie des entrees ne mene nulle part.
--
-- On ne ferme que ce qui est reellement vide. Un rayon qui porte encore une
-- commande publiee reste ouvert : c'est lui qu'il faut voir pour comprendre
-- ou est passee cette commande, et le fermer la masquerait sans rien dire.
--
-- ET SEULEMENT LES RAYONS VENUS D'UN IMPORT. « L'ancienne arborescence »,
-- c'est ce que l'import precedent a pose : ses rayons portent une reference
-- en `V2-`. Un rayon cree a la main en administration n'en a pas, et
-- balayer tout ce qui n'est pas de la nouvelle taxonomie l'emporterait
-- aussi — avec les commandes qu'il porte.
--
-- Archiver, toujours : la ligne, l'identifiant et le rangement d'origine
-- restent. Rouvrir est un geste.
--
-- Rejouable : un rayon deja ferme n'est pas retouche.
-- =====================================================================

begin;

-- Les collections vides de l'ancienne arborescence.
update public.categories c
set status = 'archived'::public.content_status, updated_at = now()
where c.parent_id is not null
  and c.status <> 'archived'
  and c.external_ref like 'V2-%'
  and not exists (
    select 1 from public.prompts p
    where p.category_id = c.id and p.status <> 'archived');

-- Puis les familles dont plus aucune collection n'est ouverte, et qui ne
-- portent elles-memes aucune commande active.
update public.categories c
set status = 'archived'::public.content_status, updated_at = now()
where c.parent_id is null
  and c.status <> 'archived'
  and c.external_ref like 'V2-%'
  and not exists (
    select 1 from public.categories e
    where e.parent_id = c.id and e.status <> 'archived')
  and not exists (
    select 1 from public.prompts p
    where p.category_id = c.id and p.status <> 'archived');

do $rapport$
declare v_ouvertes integer; v_anciennes integer;
begin
  select count(*) into v_ouvertes
  from public.categories where status <> 'archived';

  select count(*) into v_anciennes
  from public.categories
  where status <> 'archived' and external_ref like 'V2-%';

  raise notice 'Fermeture : % rayon(s) ouverts au total, dont % de l''ancienne arborescence.',
    v_ouvertes, v_anciennes;
end $rapport$;

commit;
