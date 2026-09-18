-- =====================================================================
-- Menage : fermer les rayons que le rangement a vides
--
-- Le rangement des rayons a fusionne plusieurs rayons de cinema dans
-- « Cinema », plusieurs rayons editoriaux dans « Editorial », et rapatrie
-- l'humour atypique dans « Humour ». Les rayons d'origine sont restes en
-- brouillon, vides, et continuent d'etre proposes quand on range une
-- commande — c'est-a-dire qu'on offre de classer une commande la ou plus
-- personne ne la cherchera.
--
-- RIEN N'EST SUPPRIME. Un rayon archive garde sa ligne, son identifiant et
-- ses relations ; il se rouvre d'un geste depuis l'administration. C'est la
-- regle du depot et elle vaut ici comme ailleurs : une taxonomie se ferme,
-- elle ne s'efface pas.
--
-- Les huit rayons sont nommes un par un plutot que designes par une regle
-- du genre « tout rayon V2 vide ». Une regle happerait le rayon qu'un
-- administrateur vient de creer et n'a pas encore rempli — et la fermerait
-- sous ses yeux. Une liste ne peut pas faire cette erreur.
--
-- Garde-fou : un rayon qui porte une commande n'est jamais touche, meme
-- s'il figure dans la liste. Si le catalogue a change depuis, le lot ne
-- fait rien plutot que de fermer un rayon vivant.
--
-- Rejouable : des affectations conditionnelles, aucune insertion, aucune
-- suppression.
-- =====================================================================

do $menage$
declare
  v_fermes integer;
  v_epargnes integer;
begin
  create temporary table rayons_vides (slug text primary key, motif text) on commit drop;

  insert into rayons_vides (slug, motif) values
    ('action-et-espionnage',   'fusionne dans « Cinéma »'),
    ('personnages-cultes',     'fusionne dans « Cinéma »'),
    ('ambiances-de-cinema',    'fusionne dans « Cinéma »'),
    ('fantastique-et-mystere', 'fusionne dans « Cinéma »'),
    ('business-et-leadership', 'fusionne dans « Éditorial »'),
    ('sport-et-performance',   'fusionne dans « Éditorial »'),
    ('musique-et-pop-culture', 'fusionne dans « Éditorial »'),
    ('scenes-atypiques',       'fusionne dans « Humour »');

  -- Un rayon qui porte encore une commande reste ouvert : c'est par lui
  -- qu'on la retrouve pour l'en sortir.
  select count(*) into v_epargnes
  from public.categories c
  join rayons_vides r on r.slug = c.slug
  where exists (select 1 from public.prompts p where p.category_id = c.id);

  if v_epargnes > 0 then
    raise notice 'Ménage : % rayon(s) épargné(s), ils portent encore des commandes.', v_epargnes;
  end if;

  update public.categories c
  set status = 'archived'::public.content_status
  from rayons_vides r
  where r.slug = c.slug
    and c.status <> 'archived'
    and not exists (select 1 from public.prompts p where p.category_id = c.id);

  get diagnostics v_fermes = row_count;
  raise notice 'Ménage : % rayon(s) vidé(s) par le rangement, désormais fermé(s).', v_fermes;
end $menage$;
