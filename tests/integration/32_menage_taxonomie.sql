-- =====================================================================
-- Le rangement ne laisse pas de rayons fantomes derriere lui
--
-- Chaque refonte de taxonomie laisse des rayons vides. Tant qu'ils ne sont
-- pas fermes, l'administration continue de les proposer quand on range une
-- commande : on offre de classer une commande la ou plus personne ne la
-- cherchera.
--
-- Ce test verifie que le menage a ete fait, qu'il n'a rien ferme de vivant,
-- et surtout que rien n'a ete supprime — la regle du depot interdit la
-- suppression physique d'une categorie, et un lot de menage est exactement
-- l'endroit ou l'on serait tente de l'oublier.
-- =====================================================================
do $menage$
declare
  v_n integer;
  v_total integer;
begin
  -- --- Les huit rayons vides sont fermes --------------------------------
  select count(*) into v_n
  from public.categories
  where slug in (
      'action-et-espionnage', 'personnages-cultes', 'ambiances-de-cinema',
      'fantastique-et-mystere', 'business-et-leadership', 'sport-et-performance',
      'musique-et-pop-culture', 'scenes-atypiques'
    )
    and status <> 'archived';

  if v_n > 0 then
    raise exception 'Ménage : % rayon(s) vidé(s) par le rangement sont encore proposés.', v_n;
  end if;

  -- --- Mais ils existent toujours ---------------------------------------
  --
  -- Un rayon archive garde sa ligne, ses relations et son identifiant. Le
  -- jour ou l'on voudra le rouvrir, tout y est.
  select count(*) into v_n
  from public.categories
  where slug in (
      'action-et-espionnage', 'personnages-cultes', 'ambiances-de-cinema',
      'fantastique-et-mystere', 'business-et-leadership', 'sport-et-performance',
      'musique-et-pop-culture', 'scenes-atypiques'
    );

  if v_n <> 8 then
    raise exception 'Ménage : % rayon(s) sur 8 subsistent — une ligne a été supprimée.', v_n;
  end if;

  -- --- Aucun rayon vivant n'a ete ferme ---------------------------------
  select count(*) into v_n
  from public.categories c
  where c.status = 'archived'
    and c.external_ref like 'V2-%'
    and exists (
      select 1 from public.prompts p
      where p.category_id = c.id and p.status = 'published'
    );

  if v_n > 0 then
    raise exception 'Ménage : % rayon(s) fermé(s) alors qu''ils portent des commandes publiées.', v_n;
  end if;

  -- --- Ce que l'administration propose reste raisonnable -----------------
  --
  -- Une liste deroulante de rangement ne doit contenir que des rayons ou
  -- l'on range vraiment, plus ceux qui portent encore quelque chose a en
  -- sortir. Le seuil n'est pas une regle produit : c'est un garde-fou qui
  -- leve si une refonte future oublie son menage.
  select count(*) into v_total
  from public.categories c
  where c.status <> 'archived'
     or exists (select 1 from public.prompts p where p.category_id = c.id);

  if v_total > 90 then
    raise exception 'Ménage : % catégories proposées au rangement, le ménage a été oublié.', v_total;
  end if;

  raise notice 'Ménage de la taxonomie : vérifié (% catégories proposables).', v_total;
end $menage$;
