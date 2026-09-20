-- =====================================================================
-- Publication des cartes du catalogue final
--
-- Les 585 cartes ajoutees arrivent en brouillon, comme le fichier
-- d'import les declare. Ce fichier les met en ligne.
--
-- IL EST SEPARE DU RESTE DU LOT, ET IL N'EST PAS JOUE PAR DEFAUT.
-- Installer un catalogue et le rendre visible sont deux decisions : la
-- premiere se verifie, la seconde se voit par tout le monde. Le workflow
-- ne lance ce fichier que sur le mot « basculer ».
--
-- ELLES N'ONT PAS DE VISUEL, ET CE N'EST PAS UN PROBLEME D'ORDRE.
-- L'ordre du catalogue place `media_ready` en premiere cle : une carte
-- sans visuel ferme naturellement la liste, derriere tout ce qui se
-- montre. Les cartes illustrees restent devant sans qu'on ait rien a
-- epingler, et la Bibliotheque leur pose une teinte plutot qu'un cadre
-- vide.
--
-- UNE CARTE NE PART EN LIGNE QUE SI ELLE A DE QUOI SERVIR : une
-- collection, une description et un texte a copier. Ce n'est pas une
-- precaution theorique — une carte publiee sans payload affiche un bouton
-- de copie qui echoue, et personne ne peut comprendre pourquoi.
--
-- Rejouable : une carte deja publiee n'est pas retouchee, et
-- `published_at` garde sa premiere date.
-- =====================================================================

begin;

update public.prompts p
set status = 'published'::public.content_status,
    published_at = coalesce(p.published_at, now()),
    updated_at = now()
where p.external_ref like 'V2-%'
  and p.status = 'draft'
  and p.category_id is not null
  and coalesce(p.short_description, '') <> ''
  and exists (
    select 1 from public.prompt_variants v
    join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
    where v.prompt_id = p.id);

do $rapport$
declare
  v_publiees integer;
  v_retenues integer;
  v_sans_tag integer;
begin
  select count(*) filter (where status = 'published'),
         count(*) filter (where status = 'draft')
  into v_publiees, v_retenues
  from public.prompts where external_ref like 'V2-%';

  -- Une carte publiee sans tag n'apparait dans aucun rayon de la
  -- Bibliotheque : elle n'est atteignable que par la recherche.
  select count(*) into v_sans_tag
  from public.prompts p
  where p.external_ref like 'V2-%' and p.status = 'published'
    and not exists (select 1 from public.prompt_tags pt where pt.prompt_id = p.id);

  if v_retenues > 0 then
    raise notice 'Publication : % carte(s) retenue(s) en brouillon — collection, description ou texte manquant.', v_retenues;
  end if;
  if v_sans_tag > 0 then
    raise notice 'Publication : % carte(s) publiee(s) sans tag — invisibles dans les rayons.', v_sans_tag;
  end if;

  raise notice 'Publication : % carte(s) du catalogue final en ligne.', v_publiees;
end $rapport$;

commit;
