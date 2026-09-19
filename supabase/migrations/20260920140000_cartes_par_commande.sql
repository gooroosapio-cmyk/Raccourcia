-- =====================================================================
-- Une commande, plusieurs cartes
--
-- Le referentiel V2 separe deux choses que le schema confondait : la
-- commande — l'objectif qu'on invoque par /monraccourci — et la carte, la
-- variante executable de cet objectif.
--
-- /vintageportrait est une commande. « Annees folles », « Studio 1940 » et
-- « Carte postale 1900 » sont trois cartes : compositions, entrees et
-- rendus differents pour un meme objectif. Jusqu'ici, il fallait inventer
-- trois commandes — /1920sportrait, /1950sstudio, /1900postcard — donc
-- trois noms a retenir pour une seule idee. La base V2 en compte 429 pour
-- 1 010 cartes : 428 commandes portent plusieurs cartes.
--
-- CE QUE CETTE MIGRATION NE FAIT PAS. Elle ne touche a aucun contenu :
-- ni commande, ni carte, ni visuel, ni payload. Elle ouvre la place. Le
-- catalogue V2 arrive par un lot separe, en brouillon, comme le fichier
-- d'import le declare lui-meme.
--
-- Rejouable : `add column if not exists`, index recrees a l'identique.
-- =====================================================================

-- --- Ce qui relie les cartes d'une meme commande ------------------------
alter table public.prompts
  -- L'identifiant stable de la commande, partage par toutes ses cartes.
  -- Il vient du fichier d'import et ne change pas au renommage.
  add column if not exists command_id uuid,
  -- Ce que la commande promet, independamment de la carte choisie.
  add column if not exists command_objectif text,
  -- Ce qui distingue cette carte des autres de la meme commande :
  -- « annees-folles », « studio-1940 ». Nul pour une commande a carte
  -- unique — l'immense majorite du catalogue d'avant la V2.
  add column if not exists card_slug text,
  -- Combien d'informations la fiche demande au plus avant de copier.
  -- Le referentiel le fixe par carte : zero pour un jeu, trois pour une
  -- analyse financiere. Au-dela, la fiche devient un questionnaire.
  add column if not exists fiche_champs_max smallint;

alter table public.prompts
  drop constraint if exists prompts_fiche_champs_max_check;
alter table public.prompts
  add constraint prompts_fiche_champs_max_check
  check (fiche_champs_max is null or fiche_champs_max between 0 and 3);

create index if not exists prompts_command_id_idx
  on public.prompts (command_id) where status = 'published';

-- --- L'unicite change de perimetre --------------------------------------
--
-- Une commande n'est plus unique a elle seule : c'est le couple
-- (commande, carte) qui l'est. Sans ce changement, importer les trois
-- cartes de /vintageportrait echouerait sur la deuxieme.
--
-- `coalesce` et non la colonne nue : deux cartes sans slug seraient
-- considerees distinctes par un index qui ignore les nuls, et le doublon
-- de commande qu'on veut interdire passerait.
-- Les lots d'import anterieurs visaient l'ancien index par sa condition
-- (`on conflict (command) where status <> 'archived'`). Leur clause a ete
-- alignee sur le nouveau couple dans le meme changement : pour une commande
-- a carte unique — la forme de tout le catalogue d'avant la V2 — les deux
-- index designent exactement les memes lignes, donc rien ne change pour
-- elles. Sans cet alignement, rejouer un ancien lot echouerait sur une
-- inference sans index correspondant.
drop index if exists public.prompts_command_active_unique;

create unique index if not exists prompts_carte_active_unique
  on public.prompts (command, coalesce(card_slug, ''))
  where status <> 'archived';

-- --- Les familles de tags du referentiel V2 -----------------------------
--
-- Le referentiel en decrit six : bibliotheque, usage, style, rendu,
-- capacite, public/contexte. Cinq existaient deja sous un autre nom ;
-- « capacite » est nouvelle — elle dit quel outil est indispensable
-- (lecture d'image, fichiers, recherche), ce qui n'est ni un style ni un
-- usage.
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'tag_group' and e.enumlabel = 'capacite'
  ) then
    alter type public.tag_group add value 'capacite';
  end if;
end $$;

comment on column public.prompts.command_id is
  'Identifiant stable de la commande, partage par toutes ses cartes.';
comment on column public.prompts.card_slug is
  'Ce qui distingue une carte des autres de la meme commande.';
comment on column public.prompts.fiche_champs_max is
  'Nombre maximal d''informations demandees sur la fiche avant de copier.';

do $rapport$
declare
  v_cartes integer;
  v_commandes integer;
begin
  select count(*), count(distinct command) into v_cartes, v_commandes
  from public.prompts where status <> 'archived';
  raise notice 'Cartes par commande : % carte(s) actives pour % commande(s).', v_cartes, v_commandes;
end $rapport$;
