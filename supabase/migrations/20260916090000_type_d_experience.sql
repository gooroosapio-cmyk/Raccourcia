-- =====================================================================
-- Le type d'experience, dit explicitement.
--
-- RaccourcIA propose trois choses qui ne se lancent ni ne se presentent de
-- la meme facon : une transformation d'image, un mode conversationnel, un
-- parcours guide. Le classeur V2 le dit dans `entity_type` ; la base, elle,
-- ne le portait qu'en creux — `show_image_card` vrai pour les images,
-- `mode` a « texte » pour les modes IA, et le reste par elimination.
--
-- Deduire un type par elimination marche jusqu'au jour ou l'on ajoute un
-- quatrieme genre. Et le bouton d'action en depend : on ne « cree » pas un
-- parcours, on le commence.
--
-- Migration additive. La colonne est remplie par les lots du catalogue V2 ;
-- une commande d'un autre import la laisse nulle, et l'ecran retombe alors
-- sur ce qu'il faisait avant.
--
-- Idempotente.
-- =====================================================================

alter table public.prompts
  add column if not exists entity_type text;

comment on column public.prompts.entity_type is
  'Le genre d''experience : commande_image, mode_ia ou parcours. Vient du classeur V2. Nul pour une commande d''un import anterieur.';

alter table public.prompts
  drop constraint if exists prompts_entity_type_connu;

alter table public.prompts
  add constraint prompts_entity_type_connu
  check (entity_type is null or entity_type in ('commande_image', 'mode_ia', 'parcours'));

create index if not exists prompts_entity_type_idx
  on public.prompts (entity_type)
  where entity_type is not null;
