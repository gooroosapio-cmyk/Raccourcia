-- =====================================================================
-- DES « J'AIME » DE DEPART — DONNEES DE PRESENTATION, PAS DES MESURES
--
-- LISEZ CECI AVANT DE REJOUER CE FICHIER.
--
-- Il ecrit un nombre tire au sort entre 0 et 20 dans `like_count`. Ces
-- chiffres ne comptent personne : aucune ligne n'existe en face dans
-- `prompt_likes`, et aucun membre n'a rien aime. C'est une donnee de
-- presentation, demandee pour que les cartes ne s'affichent pas toutes a
-- zero avant l'ouverture du service.
--
-- CE QUE CELA IMPLIQUE, ET QU'IL FAUT ASSUMER. Un compteur affiche a
-- cote d'un coeur se lit comme une mesure d'usage. Tant que ces valeurs
-- sont en place, l'application montre donc a ses visiteurs une popularite
-- qui n'a pas eu lieu. C'est acceptable sur un catalogue qui n'a pas
-- encore ouvert ; cela cesse de l'etre le jour ou quelqu'un paie en
-- s'appuyant dessus.
--
-- A FAIRE AVANT L'OUVERTURE, et c'est le point 0 de la check-list de
-- lancement : rejouer la remise a zero ci-dessous, puis laisser le
-- declencheur de `prompt_likes` tenir le compte pour de vrai.
--
--   update public.prompts p
--   set like_count = (select count(*) from public.prompt_likes l
--                     where l.prompt_id = p.id);
--
-- Le tirage est SEME par l'identifiant de la carte : rejouer ce fichier
-- rend les memes nombres. Un `random()` nu donnerait des chiffres
-- differents a chaque passage, et une carte vue a 14 hier puis a 3
-- aujourd'hui se lit comme une panne.
--
-- Ne touche que les cartes dont le compte reel est a zero : une commande
-- reellement aimee garde son vrai chiffre.
-- =====================================================================

begin;

update public.prompts p
set like_count = (abs(hashtext(p.id::text)) % 21),
    updated_at = now()
where p.status = 'published'
  and p.like_count = 0
  and not exists (select 1 from public.prompt_likes l where l.prompt_id = p.id);

do $rapport$
declare
  v_touchees integer;
  v_reels integer;
begin
  select count(*) into v_touchees
  from public.prompts p
  where p.status = 'published' and p.like_count > 0
    and not exists (select 1 from public.prompt_likes l where l.prompt_id = p.id);

  select count(*) into v_reels from public.prompt_likes;

  raise notice 'J''aime de depart : % carte(s) portent un nombre fictif.', v_touchees;
  raise notice 'J''aime reels en base : %. A remettre a zero avant l''ouverture.', v_reels;
end $rapport$;

commit;
