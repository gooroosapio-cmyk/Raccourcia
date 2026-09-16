-- =====================================================================
-- Le moteur V3 : ce qu'une commande sait faire, et comment on l'evalue.
--
-- Le catalogue V2 avait apporte les cartes ; il leur manquait la matiere.
-- Sept colonnes l'ajoutent, toutes issues du classeur et toutes destinees
-- a un ecran :
--
--   contexte           quand se servir de la commande ;
--   specification      ce qu'elle sait faire — les « capacites » d'un mode ;
--   livrables          ce qu'elle rend, d'ou se deduit le nombre d'etapes ;
--   questions_cadrage  par quoi elle commence, donc l'exemple de depart ;
--   criteres_reussite  a quoi l'on reconnait un bon resultat ;
--   erreurs            ce qu'elle refuse de faire ;
--   regle_sortie       comment on en sort, pour un mode.
--
-- Elles sont publiques : ce sont des descriptions, pas du contenu premium.
-- Le texte a copier reste dans `prompt_versions`, ferme au navigateur, et ne
-- sort que par `resolve_prompt` apres ses six controles. Rien ici ne
-- contourne cette porte.
--
-- Additive et rejouable : les colonnes arrivent vides, et aucune donnee
-- existante n'est touchee.
-- =====================================================================

alter table public.prompts
  add column if not exists contexte text,
  add column if not exists specification text,
  add column if not exists livrables text,
  add column if not exists questions_cadrage text,
  add column if not exists criteres_reussite text,
  add column if not exists erreurs text,
  add column if not exists regle_sortie text;

comment on column public.prompts.specification is
  'Ce que la commande sait faire. Sert de « capacites » sur la carte d''un mode IA.';
comment on column public.prompts.livrables is
  'Ce que la commande rend. Le nombre d''etapes d''un parcours s''en deduit.';
comment on column public.prompts.questions_cadrage is
  'Par quoi la commande commence. Sert d''exemple de premiere demande.';

grant select (contexte) on table public.prompts to anon, authenticated;
grant select (specification) on table public.prompts to anon, authenticated;
grant select (livrables) on table public.prompts to anon, authenticated;
grant select (questions_cadrage) on table public.prompts to anon, authenticated;
grant select (criteres_reussite) on table public.prompts to anon, authenticated;
grant select (erreurs) on table public.prompts to anon, authenticated;
grant select (regle_sortie) on table public.prompts to anon, authenticated;
