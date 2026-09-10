-- =====================================================================
-- Bascule de taxonomie V5
--
-- A appliquer apres les lots de `supabase/seed/v5/`, jamais avant. C'est
-- la seule etape que les membres verront : les quatorze familles V5
-- s'ouvrent, les 429 commandes canoniques publiees les rejoignent, les
-- raccourcis qu'elles ont absorbes quittent le catalogue, et l'ancienne
-- taxonomie est archivee.
--
-- Rien n'est supprime. Un raccourci absorbe garde sa ligne, ses visuels,
-- son historique et son identifiant : une adresse deja partagee continue de
-- repondre, `resoudre_alias` la conduisant vers la commande qui fait
-- desormais le travail.
--
-- RETOUR ARRIERE — la sauvegarde posee en tete rend l'etat exact :
--   update public.prompts p
--     set category_id = s.category_id,
--         status = s.status::public.content_status,
--         is_free = s.is_free
--     from public.prompts_avant_bascule_v5 s where s.id = p.id;
--   update public.categories set status = 'published'::public.content_status
--    where external_ref is not null and external_ref not like '%-V5-%';
--   update public.categories set status = 'draft'::public.content_status
--    where external_ref like '%-V5-%';
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Sauvegarde de ce que la bascule deplace
-- ---------------------------------------------------------------------

create table if not exists public.prompts_avant_bascule_v5 as
select id, external_ref, command::text as command, category_id,
       status::text as status, is_free, now() as sauvegarde_le
from public.prompts;

revoke all on table public.prompts_avant_bascule_v5 from anon, authenticated;

comment on table public.prompts_avant_bascule_v5 is
  'Rangement, statut et palier des raccourcis avant la bascule V5. Sert au retour arriere.';

-- ---------------------------------------------------------------------
-- Refus de basculer sur un catalogue partiel
--
-- La production a deja affiche des puces vides une fois, heritees d'un
-- import laisse a moitie. Si le compte n'y est pas, rien ne bouge.
-- ---------------------------------------------------------------------

do $ctrl$
declare
  v_canoniques integer;
  v_payloads integer;
  v_alias integer;
  v_familles integer;
  v_orphelins integer;
  v_noms text;
  v_vides integer;
begin
  select count(*) into v_canoniques from public.prompts where level is not null;
  if v_canoniques <> 433 then
    raise exception 'Bascule refusee : % commandes V5 au lieu de 433. L''import n''est pas passe.', v_canoniques;
  end if;

  select count(*) into v_payloads
  from public.prompt_versions pv
  join public.prompt_variants v on v.id = pv.variant_id
  join public.prompts p on p.id = v.prompt_id and p.level is not null
  where pv.is_current and pv.version_label = 'v5-final';
  if v_payloads <> 1299 then
    raise exception 'Bascule refusee : % payloads V5 courants au lieu de 1299.', v_payloads;
  end if;

  -- Pas un compte absolu : une base de recette ne contient pas toujours
  -- tout l'historique, et les alias dont le raccourci d'origine manque n'y
  -- sont pas crees. Ce qui doit etre vrai partout, c'est qu'ils existent —
  -- le controle des orphelins ci-dessous se charge du reste, et il est
  -- autrement plus protecteur qu'un nombre.
  select count(*) into v_alias from public.prompt_aliases;
  if v_alias = 0 then
    raise exception 'Bascule refusee : aucun alias enregistre. Le lot 810 n''est pas passe.';
  end if;

  select count(*) into v_familles from public.categories where external_ref like '%-V5-%';
  if v_familles <> 14 then
    raise exception 'Bascule refusee : % familles V5 au lieu de 14.', v_familles;
  end if;

  -- Le controle qui compte le plus. Une commande publiee dans une famille
  -- que cette bascule va archiver, et qui ne serait ni canonique ni
  -- absorbee, n'a nulle part ou aller : elle disparaitrait de l'ecran sans
  -- que rien ne la remplace et sans qu'aucune adresse ne la rattrape.
  --
  -- Borne aux familles que la bascule ferme : une commande rangee ailleurs
  -- garde sa famille et n'est concernee par rien de tout ceci.
  --
  -- Le message nomme les coupables. Un refus qui donne un nombre laisse
  -- l'operateur chercher; un refus qui donne des noms se traite.
  select count(*), string_agg(p.command::text, ', ' order by p.command::text)
    into v_orphelins, v_noms
  from public.prompts p
  join public.categories c on c.id = p.category_id and c.is_visible
  where p.status = 'published'
    and c.external_ref is not null
    and c.external_ref not like '%-V5-%'
    and p.level is null
    and not exists (select 1 from public.prompt_aliases a where a.alias_prompt_id = p.id);
  if v_orphelins > 0 then
    raise exception 'Bascule refusee : % raccourcis publies ne sont ni canoniques ni absorbes (%). Les archiver ou leur donner une destination avant de basculer.',
      v_orphelins, v_noms;
  end if;

  -- Une famille ouverte sans commande est un cul-de-sac.
  select count(*) into v_vides
  from public.categories f
  where f.external_ref like '%-V5-%'
    and not exists (
      select 1
      from jsonb_to_recordset($raccourcia$[{"ref":"RCI-IMG-001","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-002","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-003","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-004","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-005","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-006","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-007","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-008","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-009","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-010","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-044","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-045","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-046","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-047","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-048","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-049","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-091","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-092","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-093","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-094","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-095","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-111","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-112","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-113","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-114","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-115","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-135","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-136","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-148","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-133","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-143","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-147","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-149","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-134","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-146","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-139","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-140","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-145","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-142","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-137","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-138","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-144","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-150","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-131","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-132","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-141","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-011","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-012","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-015","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-016","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-018","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-019","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-020","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-021","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-022","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-023","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-063","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-064","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-065","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-066","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-067","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-068","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-069","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-070","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-071","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-116","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-117","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-118","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-119","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-152","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-151","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-193","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-159","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-189","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-166","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-201","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-192","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-186","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-185","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-196","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-187","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-195","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-199","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-171","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-188","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-181","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-200","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-172","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-158","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-205","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-173","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-194","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-210","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-165","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-182","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-183","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-191","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-184","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-170","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-202","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-198","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-197","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-179","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-175","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-208","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-203","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-168","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-209","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-190","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-157","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-207","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-025","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-026","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-027","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-029","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-030","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-031","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-034","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-072","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-073","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-074","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-075","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-076","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-077","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-078","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-120","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-121","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-122","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-246","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-232","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-251","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-224","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-221","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-250","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-235","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-230","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-220","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-242","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-233","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-229","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-231","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-223","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-219","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-237","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-226","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-212","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-247","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-238","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-216","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-252","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-249","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-248","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-243","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-225","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-241","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-253","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-218","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-236","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-228","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-240","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-244","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-255","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-254","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-239","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-234","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-227","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-222","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-213","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-245","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-217","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-013","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-014","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-028","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-032","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-033","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-079","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-080","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-081","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-082","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-083","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-084","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-085","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-086","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-087","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-088","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-089","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-090","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-123","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-124","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-125","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-264","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-269","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-261","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-263","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-270","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-262","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-266","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-265","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-259","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-256","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-260","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-267","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-035","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-036","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-037","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-038","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-039","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-040","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-041","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-042","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-043","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-126","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-127","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-128","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-289","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-283","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-281","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-278","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-279","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-287","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-290","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-286","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-284","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-288","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-285","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-282","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-280","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-050","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-051","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-052","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-053","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-054","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-055","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-056","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-057","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-058","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-059","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-060","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-061","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-096","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-097","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-098","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-099","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-100","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-101","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-102","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-103","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-104","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-105","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-106","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-107","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-108","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-109","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-110","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-129","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-130","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-295","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-301","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-316","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-297","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-311","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-299","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-325","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-313","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-293","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-308","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-314","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-327","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-329","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-319","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-330","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-320","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-291","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-317","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-312","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-324","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-307","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-302","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-323","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-310","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-315","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-300","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-296","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-305","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-318","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-306","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-326","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-322","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-309","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-292","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-303","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-321","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-294","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-304","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-298","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-328","family_id":"IMG-V5-05"},{"ref":"RCI-TXT-004","family_id":"TXT-V5-01"},{"ref":"RCI-TXT-028","family_id":"TXT-V5-01"},{"ref":"RCI-TXT-029","family_id":"TXT-V5-01"},{"ref":"RCI-TXT-020","family_id":"TXT-V5-01"},{"ref":"RCI-TXT-065","family_id":"TXT-V5-01"},{"ref":"RCI-TXT-067","family_id":"TXT-V5-01"},{"ref":"RCI-TXT-085","family_id":"TXT-V5-01"},{"ref":"RCI-TXT-001","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-003","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-010","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-145","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-204","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-021","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-011","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-012","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-054","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-033","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-058","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-059","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-207","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-208","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-200","family_id":"TXT-V5-02"},{"ref":"RCI-ANA-009","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-007","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-042","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-044","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-063","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-006","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-019","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-212","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-047","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-069","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-070","family_id":"TXT-V5-03"},{"ref":"RCI-ANA-014","family_id":"TXT-V5-03"},{"ref":"RCI-ANA-013","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-022","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-023","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-025","family_id":"TXT-V5-04"},{"ref":"RCI-ANA-017","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-072","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-073","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-074","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-075","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-076","family_id":"TXT-V5-04"},{"ref":"RCI-ANA-023","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-077","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-078","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-080","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-151","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-071","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-153","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-035","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-036","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-094","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-159","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-017","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-141","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-018","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-052","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-053","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-060","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-143","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-196","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-193","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-197","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-146","family_id":"TXT-V5-05"},{"ref":"RCI-ANA-005","family_id":"TXT-V5-05"},{"ref":"RCI-ANA-019","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-154","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-155","family_id":"TXT-V5-05"},{"ref":"RCI-ANA-021","family_id":"TXT-V5-05"},{"ref":"RCI-ANA-022","family_id":"TXT-V5-05"},{"ref":"RCI-ANA-040","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-231","family_id":"TXT-V5-05"},{"ref":"RCI-ANA-016","family_id":"TXT-V5-06"},{"ref":"RCI-ANA-007","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-V5-077","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-V5-078","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-156","family_id":"TXT-V5-06"},{"ref":"RCI-ANA-024","family_id":"TXT-V5-06"},{"ref":"RCI-ANA-025","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-230","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-038","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-039","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-091","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-097","family_id":"TXT-V5-06"},{"ref":"RCI-ANA-011","family_id":"TXT-V5-06"},{"ref":"RCI-ANA-033","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-088","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-090","family_id":"TXT-V5-06"},{"ref":"RCI-ANA-035","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-214","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-215","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-218","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-222","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-223","family_id":"TXT-V5-07"},{"ref":"RCI-ANA-027","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-226","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-225","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-224","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-227","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-228","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-016","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-232","family_id":"TXT-V5-07"},{"ref":"RCI-ANA-029","family_id":"TXT-V5-07"},{"ref":"RCI-ANA-032","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-158","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-087","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-233","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-089","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-014","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-083","family_id":"TXT-V5-07"},{"ref":"RCI-ANA-028","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-161","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-162","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-164","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-168","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-166","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-167","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-234","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-170","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-171","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-172","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-173","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-174","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-175","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-178","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-181","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-183","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-184","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-185","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-186","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-187","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-188","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-235","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-045","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-050","family_id":"TXT-V5-07"}]$raccourcia$::jsonb) as d(ref text, family_id text)
      join public.prompts p on p.external_ref = d.ref
      where d.family_id = f.external_ref and p.status = 'published'
    );
  if v_vides > 0 then
    raise exception 'Bascule refusee : % familles V5 n''accueilleraient aucune commande.', v_vides;
  end if;
end $ctrl$;

-- ---------------------------------------------------------------------
-- Le palier offert suit la commande qui fait le travail
--
-- Trois raccourcis offerts sont absorbes. Sans ce transfert, un visiteur
-- qui pouvait copier /eventposter perdrait cette possibilite alors que le
-- meme travail se fait toujours, sous le nom de la commande canonique.
-- Le palier est un arbitrage commercial : il se corrige d'un clic depuis
-- l'administration si cette generosite n'est pas voulue.
-- ---------------------------------------------------------------------

update public.prompts canon
set is_free = true
from public.prompt_aliases a
join public.prompts ancien on ancien.id = a.alias_prompt_id
where canon.id = a.canonical_prompt_id
  and ancien.is_free
  and ancien.status = 'published'
  and not canon.is_free;

-- ---------------------------------------------------------------------
-- Les quatorze familles s'ouvrent
--
-- `is_visible` est derivee du statut par declencheur : publier suffit.
-- Elles s'ouvrent avant que les commandes n'arrivent, et tout tient dans la
-- meme transaction : personne ne voit ni rayon vide ni commande orpheline.
-- ---------------------------------------------------------------------

update public.categories
set status = 'published'::public.content_status
where external_ref like '%-V5-%';

-- ---------------------------------------------------------------------
-- Chaque commande canonique rejoint sa famille
-- ---------------------------------------------------------------------

update public.prompts p
set category_id = f.id
from jsonb_to_recordset($raccourcia$[{"ref":"RCI-IMG-001","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-002","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-003","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-004","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-005","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-006","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-007","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-008","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-009","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-010","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-044","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-045","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-046","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-047","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-048","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-049","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-091","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-092","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-093","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-094","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-095","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-111","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-112","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-113","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-114","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-115","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-135","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-136","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-148","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-133","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-143","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-147","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-149","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-134","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-146","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-139","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-140","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-145","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-142","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-137","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-138","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-144","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-150","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-131","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-132","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-141","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-011","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-012","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-015","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-016","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-018","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-019","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-020","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-021","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-022","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-023","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-063","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-064","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-065","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-066","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-067","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-068","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-069","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-070","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-071","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-116","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-117","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-118","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-119","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-152","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-151","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-193","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-159","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-189","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-166","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-201","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-192","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-186","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-185","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-196","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-187","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-195","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-199","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-171","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-188","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-181","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-200","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-172","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-158","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-205","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-173","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-194","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-210","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-165","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-182","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-183","family_id":"IMG-V5-06"},{"ref":"RCI-IMG-191","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-184","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-170","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-202","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-198","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-197","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-179","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-175","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-208","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-203","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-168","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-209","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-190","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-157","family_id":"IMG-V5-02"},{"ref":"RCI-IMG-207","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-025","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-026","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-027","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-029","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-030","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-031","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-034","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-072","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-073","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-074","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-075","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-076","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-077","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-078","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-120","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-121","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-122","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-246","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-232","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-251","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-224","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-221","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-250","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-235","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-230","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-220","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-242","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-233","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-229","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-231","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-223","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-219","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-237","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-226","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-212","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-247","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-238","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-216","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-252","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-249","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-248","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-243","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-225","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-241","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-253","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-218","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-236","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-228","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-240","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-244","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-255","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-254","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-239","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-234","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-227","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-222","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-213","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-245","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-217","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-013","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-014","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-028","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-032","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-033","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-079","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-080","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-081","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-082","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-083","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-084","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-085","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-086","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-087","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-088","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-089","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-090","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-123","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-124","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-125","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-264","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-269","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-261","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-263","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-270","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-262","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-266","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-265","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-259","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-256","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-260","family_id":"IMG-V5-03"},{"ref":"RCI-IMG-267","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-035","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-036","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-037","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-038","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-039","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-040","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-041","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-042","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-043","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-126","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-127","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-128","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-289","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-283","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-281","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-278","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-279","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-287","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-290","family_id":"IMG-V5-01"},{"ref":"RCI-IMG-286","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-284","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-288","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-285","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-282","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-280","family_id":"IMG-V5-04"},{"ref":"RCI-IMG-050","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-051","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-052","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-053","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-054","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-055","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-056","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-057","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-058","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-059","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-060","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-061","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-096","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-097","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-098","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-099","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-100","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-101","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-102","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-103","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-104","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-105","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-106","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-107","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-108","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-109","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-110","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-129","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-130","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-295","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-301","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-316","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-297","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-311","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-299","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-325","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-313","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-293","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-308","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-314","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-327","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-329","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-319","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-330","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-320","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-291","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-317","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-312","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-324","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-307","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-302","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-323","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-310","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-315","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-300","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-296","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-305","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-318","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-306","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-326","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-322","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-309","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-292","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-303","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-321","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-294","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-304","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-298","family_id":"IMG-V5-05"},{"ref":"RCI-IMG-328","family_id":"IMG-V5-05"},{"ref":"RCI-TXT-004","family_id":"TXT-V5-01"},{"ref":"RCI-TXT-028","family_id":"TXT-V5-01"},{"ref":"RCI-TXT-029","family_id":"TXT-V5-01"},{"ref":"RCI-TXT-020","family_id":"TXT-V5-01"},{"ref":"RCI-TXT-065","family_id":"TXT-V5-01"},{"ref":"RCI-TXT-067","family_id":"TXT-V5-01"},{"ref":"RCI-TXT-085","family_id":"TXT-V5-01"},{"ref":"RCI-TXT-001","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-003","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-010","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-145","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-204","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-021","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-011","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-012","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-054","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-033","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-058","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-059","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-207","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-208","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-200","family_id":"TXT-V5-02"},{"ref":"RCI-ANA-009","family_id":"TXT-V5-02"},{"ref":"RCI-TXT-007","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-042","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-044","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-063","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-006","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-019","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-212","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-047","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-069","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-070","family_id":"TXT-V5-03"},{"ref":"RCI-ANA-014","family_id":"TXT-V5-03"},{"ref":"RCI-ANA-013","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-022","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-023","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-025","family_id":"TXT-V5-04"},{"ref":"RCI-ANA-017","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-072","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-073","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-074","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-075","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-076","family_id":"TXT-V5-04"},{"ref":"RCI-ANA-023","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-077","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-078","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-080","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-151","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-071","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-153","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-035","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-036","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-094","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-159","family_id":"TXT-V5-04"},{"ref":"RCI-TXT-017","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-141","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-018","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-052","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-053","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-060","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-143","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-196","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-193","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-197","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-146","family_id":"TXT-V5-05"},{"ref":"RCI-ANA-005","family_id":"TXT-V5-05"},{"ref":"RCI-ANA-019","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-154","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-155","family_id":"TXT-V5-05"},{"ref":"RCI-ANA-021","family_id":"TXT-V5-05"},{"ref":"RCI-ANA-022","family_id":"TXT-V5-05"},{"ref":"RCI-ANA-040","family_id":"TXT-V5-05"},{"ref":"RCI-TXT-231","family_id":"TXT-V5-05"},{"ref":"RCI-ANA-016","family_id":"TXT-V5-06"},{"ref":"RCI-ANA-007","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-V5-077","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-V5-078","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-156","family_id":"TXT-V5-06"},{"ref":"RCI-ANA-024","family_id":"TXT-V5-06"},{"ref":"RCI-ANA-025","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-230","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-038","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-039","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-091","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-097","family_id":"TXT-V5-06"},{"ref":"RCI-ANA-011","family_id":"TXT-V5-06"},{"ref":"RCI-ANA-033","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-088","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-090","family_id":"TXT-V5-06"},{"ref":"RCI-ANA-035","family_id":"TXT-V5-06"},{"ref":"RCI-TXT-214","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-215","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-218","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-222","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-223","family_id":"TXT-V5-07"},{"ref":"RCI-ANA-027","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-226","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-225","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-224","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-227","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-228","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-016","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-232","family_id":"TXT-V5-07"},{"ref":"RCI-ANA-029","family_id":"TXT-V5-07"},{"ref":"RCI-ANA-032","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-158","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-087","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-233","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-089","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-014","family_id":"TXT-V5-07"},{"ref":"RCI-TXT-083","family_id":"TXT-V5-07"},{"ref":"RCI-ANA-028","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-161","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-162","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-164","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-168","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-166","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-167","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-234","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-170","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-171","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-172","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-173","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-174","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-175","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-178","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-181","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-183","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-184","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-185","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-186","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-187","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-188","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-235","family_id":"TXT-V5-08"},{"ref":"RCI-TXT-045","family_id":"TXT-V5-03"},{"ref":"RCI-TXT-050","family_id":"TXT-V5-07"}]$raccourcia$::jsonb) as d(ref text, family_id text)
join public.categories f on f.external_ref = d.family_id
where p.external_ref = d.ref and p.category_id is distinct from f.id;

-- ---------------------------------------------------------------------
-- Les raccourcis absorbes quittent le catalogue
--
-- Archives, jamais supprimes : la ligne garde ses visuels, ses favoris et
-- son historique de copie, et `resoudre_alias` conduit son ancienne
-- adresse vers la commande canonique. C'est ce que le classeur demande —
-- creer l'alias avant toute desactivation de carte.
--
-- A une condition : que la commande canonique soit publiee. Le cas n'est
-- pas theorique — /dialogue est absorbe par /story, que l'administration a
-- archive. Retirer /dialogue rendrait son adresse muette et ferait
-- disparaitre un outil sans rien mettre a la place. Il reste donc en ligne,
-- et sa famille avec lui. Publiez la commande canonique, rejouez la
-- bascule, et il partira de lui-meme.
-- ---------------------------------------------------------------------

update public.prompts
set status = 'archived'::public.content_status
where status = 'published'
  and id in (
    select a.alias_prompt_id
    from public.prompt_aliases a
    join public.prompts canon on canon.id = a.canonical_prompt_id
    where canon.status = 'published'
  );

-- ---------------------------------------------------------------------
-- L'ancienne taxonomie est archivee
--
-- Seulement si elle est vide : archiver une famille encore peuplee rendrait
-- ses commandes introuvables. Mieux vaut la laisser et le voir.
-- ---------------------------------------------------------------------

update public.categories c
set status = 'archived'::public.content_status
where c.external_ref is not null
  and c.external_ref not like '%-V5-%'
  and not exists (
    select 1 from public.prompts p
    where p.category_id = c.id and p.status = 'published'
  );

-- ---------------------------------------------------------------------
-- Controles de sortie
-- ---------------------------------------------------------------------

do $ctrl$
declare
  v_hors_ecran integer;
  v_vides integer;
  v_offertes integer;
  v_offertes_avant integer;
  v_adresses integer;
  v_gardes integer;
  v_noms_gardes text;
  v_publiees integer;
begin
  select count(*) into v_hors_ecran
  from public.prompts p
  where p.status = 'published'
    and (p.category_id is null
         or not exists (select 1 from public.categories c
                        where c.id = p.category_id and c.is_visible));
  if v_hors_ecran > 0 then
    raise exception '% commandes publiees hors des familles visibles.', v_hors_ecran;
  end if;

  select count(*) into v_vides
  from public.categories c
  where c.is_visible
    and not exists (select 1 from public.prompts p
                    where p.category_id = c.id and p.status = 'published');
  if v_vides > 0 then
    raise exception '% familles visibles sans aucune commande.', v_vides;
  end if;

  -- Le palier d'essai est la porte d'entree du produit : il ne doit pas
  -- avoir retreci en chemin.
  select count(*) into v_offertes
  from public.prompts p
  join public.categories c on c.id = p.category_id and c.is_visible
  where p.status = 'published' and p.is_free;
  select count(*) into v_offertes_avant
  from public.prompts_avant_bascule_v5 s
  where s.status = 'published' and s.is_free;
  if v_offertes < 1 then
    raise exception 'Plus aucune commande offerte n''est visible.';
  end if;

  -- Chaque adresse effectivement retiree du catalogue doit conduire
  -- quelque part. Celles qui restent en ligne n'ont besoin de personne.
  select count(*) into v_adresses
  from public.prompt_aliases a
  join public.prompts ancien on ancien.id = a.alias_prompt_id
  where ancien.status = 'archived'
    and not exists (select 1 from public.resoudre_alias(ancien.slug));
  if v_adresses > 0 then
    raise exception '% anciennes adresses retirees ne menent nulle part.', v_adresses;
  end if;

  -- Ceux qu'on a gardes se signalent : c'est une situation a regler, pas un
  -- etat d'equilibre.
  select count(*), string_agg(ancien.command::text || ' (attend ' || canon.command::text || ')', ', ')
    into v_gardes, v_noms_gardes
  from public.prompt_aliases a
  join public.prompts ancien on ancien.id = a.alias_prompt_id and ancien.status = 'published'
  join public.prompts canon on canon.id = a.canonical_prompt_id;
  if v_gardes > 0 then
    raise notice '% raccourcis absorbes restent en ligne, leur commande canonique n''etant pas publiee : %.',
      v_gardes, v_noms_gardes;
  end if;

  select count(*) into v_publiees
  from public.prompts p
  join public.categories c on c.id = p.category_id and c.is_visible
  where p.status = 'published';

  raise notice 'Bascule effectuee : % commandes visibles dans quatorze familles, % offertes (% avant).',
    v_publiees, v_offertes, v_offertes_avant;
end $ctrl$;

commit;
