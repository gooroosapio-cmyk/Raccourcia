-- =====================================================================
-- Catalogue V3 — retrait des raccourcis absents du classeur final
--
-- Dix commandes TEXTE vagues ou redondantes ne figurent plus au catalogue.
-- Elles ne sont pas supprimees : elles passent en archive. La ligne, ses
-- variantes, ses versions et ses visuels restent en base, et l'index unique
-- des commandes actives ignore les archives. Un simple passage en
-- `published` les remet au catalogue.
-- =====================================================================

update public.prompts
set status = 'archived'::public.content_status,
    admin_notes = coalesce(admin_notes || chr(10), '')
      || 'Retire du catalogue V3 le 2026-09-08 : commande jugee vague ou redondante par le classeur final.'
where external_ref in (
  'RCI-ANA-015',  -- /briefanalyse
  'RCI-TXT-030',  -- /simplify
  'RCI-TXT-031',  -- /tonepro
  'RCI-TXT-045',  -- /story
  'RCI-TXT-046',  -- /dialogue
  'RCI-TXT-050',  -- /policycopy
  'RCI-TXT-066',  -- /communitypost
  'RCI-TXT-142',  -- /goalsystem
  'RCI-TXT-148',  -- /voiceguide
  'RCI-TXT-190'   -- /financecases
)
and status <> 'archived'::public.content_status;
