-- =====================================================================
-- RaccourcIA - Socle du catalogue V5 : familles, alias, presets, niveaux
--
-- Migration strictement additive. Elle n'ecrit dans aucune ligne
-- existante, ne supprime aucune colonne, et ne rend visible aucune
-- nouvelle famille. Le catalogue en production continue de fonctionner
-- exactement comme avant : ce lot ne fait qu'ouvrir la place ou le lot
-- suivant deposera les 433 commandes canoniques.
--
-- RETOUR ARRIERE
--   drop table if exists public.prompt_aliases;
--   drop function if exists public.prompt_aliases_sans_chaine();
--   alter table public.prompts drop column if exists level;
--   alter table public.prompts drop column if exists preset_key;
--   delete from public.categories where external_ref like '%-V5-%';
--   drop type if exists public.execution_level;
-- Aucune de ces lignes ne touche a une donnee anterieure au lot.
-- =====================================================================

-- --- 1. Niveau d'execution ----------------------------------------------
-- Le classeur V5 gradue les commandes de A a E. Ce n'est pas une
-- etiquette editoriale : c'est ce qui decide combien de questions une
-- commande a le droit de poser avant de produire. Une commande de
-- niveau A execute directement avec la piece jointe; une commande de
-- niveau E mene une mission documentee.
--
-- Une enum plutot qu'un texte libre : les cinq niveaux sont une liste
-- fermee, et une valeur inventee changerait le comportement d'execution
-- sans que rien ne s'y oppose.
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'execution_level') then
    create type public.execution_level as enum ('A', 'B', 'C', 'D', 'E');
  end if;
end;
$$;

alter table public.prompts add column if not exists level public.execution_level;

comment on column public.prompts.level is
  'Niveau d''execution V5 (A a E) : combien la commande a le droit de demander avant de produire. Nul tant que la commande n''est pas passee en V5.';

-- --- 2. Preset canonique -------------------------------------------------
-- Le mode par defaut d'une commande. Il devient utile avec les alias :
-- ouvrir /adsocial doit charger /adcreative en mode « adsocial ».
alter table public.prompts add column if not exists preset_key text;

comment on column public.prompts.preset_key is
  'Mode par defaut de la commande, repris tel quel du catalogue V5.';

grant select (level) on table public.prompts to anon, authenticated;
grant select (preset_key) on table public.prompts to anon, authenticated;

-- --- 3. Alias -------------------------------------------------------------
-- Cent quarante-six raccourcis historiques deviennent des modes d'une
-- commande canonique. Leur ligne reste : c'est elle qui porte les medias,
-- les favoris, l'historique de copie et les liens deja partages. L'alias
-- ne fait que dire « ouvrir celui-la, dans ce mode ».
--
-- Rien n'est supprime, donc rien n'est perdu. Un ancien lien continue de
-- repondre, et il repond mieux qu'avant.
create table if not exists public.prompt_aliases (
  id uuid primary key default extensions.gen_random_uuid(),
  -- Le raccourci historique, conserve avec tout ce qui lui est rattache.
  alias_prompt_id uuid not null unique references public.prompts (id) on delete cascade,
  -- La commande reellement ouverte. `restrict` : on ne supprime pas une
  -- destination sous les pieds de ses alias.
  canonical_prompt_id uuid not null references public.prompts (id) on delete restrict,
  -- Le mode a appliquer, tel que le classeur le decrit.
  preset jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prompt_aliases_pas_de_renvoi_sur_soi check (alias_prompt_id <> canonical_prompt_id)
);

create index if not exists prompt_aliases_canonical_idx
  on public.prompt_aliases (canonical_prompt_id);

comment on table public.prompt_aliases is
  'Raccourcis historiques devenus des modes d''une commande canonique. La ligne du raccourci reste en place avec ses medias et son historique.';

-- Un alias pointe directement sur sa destination, sans chaine ni cycle :
-- une chaine ferait dependre le contenu servi de l'ordre d'insertion, et
-- un cycle ferait tourner la resolution sans fin.
create or replace function public.prompt_aliases_sans_chaine()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.prompt_aliases a
             where a.alias_prompt_id = new.canonical_prompt_id) then
    raise exception 'ALIAS_CHAINE'
      using hint = 'La destination est elle-meme un alias.';
  end if;

  if exists (select 1 from public.prompt_aliases a
             where a.canonical_prompt_id = new.alias_prompt_id) then
    raise exception 'ALIAS_CHAINE'
      using hint = 'Ce raccourci est deja la destination d''un alias.';
  end if;

  return new;
end;
$$;

drop trigger if exists prompt_aliases_verifier_chaine on public.prompt_aliases;
create trigger prompt_aliases_verifier_chaine
  before insert or update of alias_prompt_id, canonical_prompt_id on public.prompt_aliases
  for each row execute function public.prompt_aliases_sans_chaine();

drop trigger if exists prompt_aliases_touch on public.prompt_aliases;
create trigger prompt_aliases_touch
  before update on public.prompt_aliases
  for each row execute function public.set_updated_at();

-- --- 4. Droits sur les alias ---------------------------------------------
-- Lecture ouverte : la table ne contient que des identifiants et un mode.
-- Elle ne dit rien qu'on ne puisse deja lire, et la resolution du contenu
-- reste barree par `resolve_prompt`. L'ecriture reste a l'administration.
alter table public.prompt_aliases enable row level security;

drop policy if exists prompt_aliases_read on public.prompt_aliases;
create policy prompt_aliases_read on public.prompt_aliases
  for select using (true);

drop policy if exists prompt_aliases_admin_write on public.prompt_aliases;
create policy prompt_aliases_admin_write on public.prompt_aliases
  for all using (public.is_admin()) with check (public.is_admin());

revoke all on table public.prompt_aliases from public, anon, authenticated;
grant select on table public.prompt_aliases to anon, authenticated;

revoke all on function public.prompt_aliases_sans_chaine() from public, anon, authenticated;

-- --- 5. Les quatorze familles V5 -----------------------------------------
-- Elles arrivent invisibles et en brouillon. Aucun membre ne les voit,
-- aucune commande n'y est encore rangee : le lot suivant les remplit puis
-- bascule la visibilite en une fois. Les treize familles actuelles ne
-- sont pas touchees — ce sont elles qui servent le catalogue jusque-la.
--
-- Les identifiants V5 sont distincts des anciens (IMG-V5-01 et non
-- IMG-01) : reutiliser une reference existante avec un autre sens ferait
-- basculer des commandes sans que personne ne l'ait demande.
--
-- Le chemin de repli suit la convention des familles existantes
-- (`prompt-media/families/<mode>/<slug>.webp`). La regle R08 veut que
-- chaque famille porte son chemin des sa creation : le fichier peut
-- arriver plus tard, le chemin, lui, doit etre la des maintenant.
insert into public.categories (external_ref, mode, slug, name, short_description, sort_order, status, is_visible, fallback_image_path)
select v.external_ref, v.mode::public.app_mode, v.slug, v.name, v.short_description, v.sort_order,
       'draft'::public.content_status, false,
       'prompt-media/families/' || v.mode || '/' || v.slug || '.webp'
from (values
  ('IMG-V5-01', 'image', 'produit-et-marque', 'Produit et marque',
   'Présentez un produit, son design et ses finitions avec cohérence.', 1),
  ('IMG-V5-02', 'image', 'publicite-et-contenu-commercial', 'Publicité et contenu commercial',
   'Créez des visuels lisibles qui mettent une offre en valeur.', 2),
  ('IMG-V5-03', 'image', 'portrait-mode-et-identite', 'Portrait, mode et identité',
   'Valorisez une personne ou un style en conservant son identité.', 3),
  ('IMG-V5-04', 'image', 'lieux-architecture-et-interieur', 'Lieux, architecture et intérieur',
   'Projetez un aménagement ou améliorez la présentation d’un lieu.', 4),
  ('IMG-V5-05', 'image', 'creation-styles-et-effets-visuels', 'Création, styles et effets visuels',
   'Transformez une image avec un style ou un effet visuel distinctif.', 5),
  ('IMG-V5-06', 'image', 'technique-information-et-visualisation', 'Technique, information et visualisation',
   'Expliquez une structure, un fonctionnement ou des données en image.', 6),
  ('TXT-V5-01', 'texte', 'ecrire-et-communiquer', 'Écrire et communiquer',
   'Rédigez des messages adaptés à votre destinataire et à votre canal.', 1),
  ('TXT-V5-02', 'texte', 'vendre-et-convaincre', 'Vendre et convaincre',
   'Présentez une offre et facilitez une décision commerciale.', 2),
  ('TXT-V5-03', 'texte', 'creer-du-contenu', 'Créer du contenu',
   'Transformez vos idées et sources en contenus prêts à publier.', 3),
  ('TXT-V5-04', 'texte', 'travailler-et-s-organiser', 'Travailler et s’organiser',
   'Clarifiez les tâches, responsabilités, réunions et méthodes de travail.', 4),
  ('TXT-V5-05', 'texte', 'entreprendre-et-decider', 'Entreprendre et décider',
   'Structurez un projet, comparez les options et préparez les décisions.', 5),
  ('TXT-V5-06', 'texte', 'analyser-rechercher-et-apprendre', 'Analyser, rechercher et apprendre',
   'Comprenez des sources, analysez des données et progressez sur un sujet.', 6),
  ('TXT-V5-07', 'texte', 'produire-des-documents-professionnels', 'Produire des documents professionnels',
   'Préparez des dossiers, contrats, rapports et spécifications exploitables.', 7),
  ('TXT-V5-08', 'texte', 'gerer-ses-finances', 'Gérer ses finances',
   'Analysez les chiffres et préparez budgets, prévisions et documents financiers.', 8)
) as v(external_ref, mode, slug, name, short_description, sort_order)
where not exists (
  select 1 from public.categories c where c.external_ref = v.external_ref
);
