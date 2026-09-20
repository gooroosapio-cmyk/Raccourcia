-- =====================================================================
-- Publication du catalogue de septembre 2026
--
-- Les 1 010 cartes etaient arrivees en brouillon, le temps de verifier que
-- rien ne cassait. Elles passent en ligne.
--
-- ELLES N'ONT PAS ENCORE DE VISUEL, ET CE N'EST PAS UN PROBLEME D'ORDRE.
-- L'ordre du catalogue place `media_ready` en premiere cle : une carte sans
-- visuel ferme naturellement la liste, derriere tout ce qui se montre. Les
-- cartes illustrees restent donc devant sans qu'on ait rien a epingler, et
-- l'administration remonte ce qu'elle veut avec `is_pinned`.
--
-- Une carte ne part en ligne que si elle a de quoi servir : une collection,
-- une description et un texte a copier. Ce n'est pas une precaution
-- theorique — une carte publiee sans payload affiche un bouton de copie qui
-- echoue, et l'utilisateur n'a aucun moyen de comprendre pourquoi.
--
-- Rejouable : une carte deja publiee n'est pas retouchee, et `published_at`
-- garde sa premiere date.
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
  v_avec_visuel integer;
begin
  select count(*) filter (where status = 'published'),
         count(*) filter (where status = 'draft')
  into v_publiees, v_retenues
  from public.prompts where external_ref like 'V2-%';

  select count(*) into v_avec_visuel
  from public.prompts where status = 'published' and media_ready;

  if v_retenues > 0 then
    raise notice 'Publication : % carte(s) retenue(s) en brouillon — collection, description ou texte manquant.', v_retenues;
  end if;

  raise notice 'Publication : % carte(s) V2 en ligne. Catalogue visible : % commande(s) avec visuel.',
    v_publiees, v_avec_visuel;
end $rapport$;

commit;
