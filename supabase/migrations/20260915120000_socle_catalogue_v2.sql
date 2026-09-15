-- =====================================================================
-- Socle du catalogue V2 : la carte de galerie.
--
-- Le classeur de migration decrit chaque commande comme une carte : ce
-- qu'elle promet, ce qu'elle attend en entree, ce qu'elle rend, et les
-- regles qu'elle s'impose. Le schema portait deja le titre, la description,
-- l'entree et la sortie ; il lui manquait tout ce qui encadre l'execution.
--
-- Migration strictement additive. Aucune colonne existante n'est
-- supprimee, renommee ni retypee. Aucune donnee n'est touchee : les
-- valeurs arrivent par les lots du catalogue V2.
--
-- Idempotente : `add column if not exists` partout.
-- =====================================================================

-- --- Un slug archive ne reserve plus son adresse -----------------------
--
-- `command` porte depuis l'origine un index unique partiel : une commande
-- archivee garde sa ligne sans empecher qu'une nouvelle reprenne le meme
-- nom. Le slug, lui, avait une contrainte unique pleine — une adresse
-- restait donc reservee a vie par une commande retiree du catalogue.
--
-- La refonte V2 bute dessus : elle archive l'ancien catalogue et pose des
-- cartes qui reprennent des adresses devenues libres. On aligne donc le
-- slug sur la commande, ce qui etait l'intention d'origine.
--
-- Rien ne casse cote lecture : la fiche publique ne sert qu'une commande
-- publiee, et une ancienne adresse partagee passe par `resoudre_alias`.

alter table public.prompts drop constraint if exists prompts_slug_key;

create unique index if not exists prompts_slug_active_unique
  on public.prompts (slug)
  where status <> 'archived';

-- --- Ce que la carte annonce ------------------------------------------

alter table public.prompts
  add column if not exists cta_label text,
  add column if not exists images_min smallint,
  add column if not exists images_max smallint,
  add column if not exists witness_type text,
  add column if not exists default_ratio text,
  add column if not exists allow_ratio_override boolean not null default true;

comment on column public.prompts.cta_label is
  'Libelle du bouton d''action : « Creer ce visuel », « Activer le mode », « Lancer le parcours ». Il vient du catalogue et non du code : un parcours et une commande image ne se lancent pas avec le meme mot.';
comment on column public.prompts.images_min is
  'Nombre minimal d''images a fournir. Nul quand la commande n''en demande aucune.';
comment on column public.prompts.witness_type is
  'Ce que doit montrer l''image temoin, dit a l''utilisateur avant qu''il ne cherche : « une photo nette de la personne », « une photo du produit ».';
comment on column public.prompts.default_ratio is
  'Format de sortie propose. Texte libre : « 4:5 », « Multi-format ». Nul pour une commande qui ne rend pas d''image.';

-- --- Les regles que la commande s'impose ------------------------------
--
-- Elles sont montrees a l'utilisateur, pas seulement appliquees par l'IA :
-- savoir qu'une commande preserve les traits du sujet, ou qu'elle
-- n'inventera pas une donnee, fait partie de ce qui la rend utilisable.

alter table public.prompts
  add column if not exists identity_policy text,
  add column if not exists text_in_image_policy text,
  add column if not exists questionnaire_policy text,
  add column if not exists online_lookup_policy text,
  add column if not exists reality_policy text;

comment on column public.prompts.identity_policy is
  'Ce que la commande promet sur les traits du sujet : « Oui » quand elle les preserve toujours, « Selon l''entree » sinon.';
comment on column public.prompts.reality_policy is
  'Garde-fou annonce : ne pas presenter une invention comme un fait. Affiche cote membre, jamais seulement applique en silence.';

-- --- Recherche et referencement ---------------------------------------

alter table public.prompts
  add column if not exists search_keywords text[] not null default '{}'::text[],
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists priority_score integer;

comment on column public.prompts.search_keywords is
  'Formulations sans accent ni ponctuation, telles qu''on les tape. Elles alimentent la recherche tolerante a cote du titre et de la description.';
comment on column public.prompts.priority_score is
  'Poids editorial du classeur, utilise pour ordonner une collection. Plus haut vient en premier.';

-- --- L'identifiant du classeur -----------------------------------------
--
-- Le classeur donne a chaque carte un `card_id` stable. Il ne remplace pas
-- `external_ref`, qui dit de quel import la ligne vient : une commande
-- reprise par le classeur en porte desormais deux, et aucune ne se perd.

alter table public.prompts
  add column if not exists card_id text;

comment on column public.prompts.card_id is
  'Identifiant de carte du classeur V2, repris tel quel. Distinct de external_ref, qui garde la trace de l''import d''origine.';

create unique index if not exists prompts_card_id_unique
  on public.prompts (card_id)
  where card_id is not null;

-- --- Appartenance au catalogue V2 --------------------------------------
--
-- Distincte de `catalog_version`, qui dit d'ou vient une commande et ne
-- doit pas etre reecrite : une commande importee en v5.1 et reprise par le
-- classeur V2 appartient aux deux, et effacer sa provenance ferait mentir
-- tous les controles d'import.

alter table public.prompts
  add column if not exists catalog_v2 boolean not null default false;

comment on column public.prompts.catalog_v2 is
  'La commande fait partie du catalogue de galerie V2. Sa provenance reste dans catalog_version.';

create index if not exists prompts_catalog_v2_idx on public.prompts (catalog_v2) where catalog_v2;

-- --- La carte a-t-elle de quoi etre copiee ? ---------------------------
--
-- Le catalogue V2 arrive sans payload : les cartes existent, leur texte
-- vient ensuite. Une carte sans texte ne doit pas proposer un bouton de
-- copie qui ne copierait rien — et le client ne peut pas le savoir seul,
-- puisque `prompt_versions` lui est ferme et doit le rester.
--
-- D'ou cette colonne, maintenue par la base comme `media_ready` l'est pour
-- les visuels : une colonne que l'appelant renseignerait dirait un jour le
-- contraire de la table qu'elle resume.

alter table public.prompts
  add column if not exists payload_ready boolean not null default false;

comment on column public.prompts.payload_ready is
  'La commande a un texte a copier : au moins une version courante publiee, non vide. Maintenue par declencheur sur prompt_versions.';

create or replace function public.prompt_payload_ready(p_prompt_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.prompt_variants v
    join public.prompt_versions pv on pv.variant_id = v.id
    where v.prompt_id = p_prompt_id
      and v.status = 'published'
      and pv.is_current
      and pv.status = 'published'
      and coalesce(btrim(pv.payload), '') <> ''
  )
$$;

create or replace function public.prompt_payload_ready_refresh(p_prompt_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.prompts p
     set payload_ready = public.prompt_payload_ready(p.id)
   where p.id = p_prompt_id
     and p.payload_ready is distinct from public.prompt_payload_ready(p.id);
$$;

-- Deux tables mènent a la colonne : la version porte le texte, la variante
-- porte son statut. Deux corps distincts, comme pour les visuels : `new`
-- porte le type de sa table et PL/pgSQL resout les champs a la
-- preparation, donc un corps unique echouerait des la premiere ligne.
create or replace function public.prompt_versions_apres_ecriture()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prompt_id uuid;
begin
  select v.prompt_id into v_prompt_id
  from public.prompt_variants v
  where v.id = coalesce(new.variant_id, old.variant_id);

  if v_prompt_id is not null then
    perform public.prompt_payload_ready_refresh(v_prompt_id);
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.prompt_variants_apres_ecriture()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.prompt_payload_ready_refresh(coalesce(new.prompt_id, old.prompt_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists prompt_versions_refresh_payload on public.prompt_versions;
create trigger prompt_versions_refresh_payload
  after insert or update or delete on public.prompt_versions
  for each row execute function public.prompt_versions_apres_ecriture();

drop trigger if exists prompt_variants_refresh_payload on public.prompt_variants;
create trigger prompt_variants_refresh_payload
  after insert or update or delete on public.prompt_variants
  for each row execute function public.prompt_variants_apres_ecriture();

-- Mise a niveau du catalogue deja en place : sans elle, toutes les
-- commandes existantes se declareraient sans texte jusqu'a leur prochaine
-- ecriture.
update public.prompts p
   set payload_ready = public.prompt_payload_ready(p.id)
 where p.payload_ready is distinct from public.prompt_payload_ready(p.id);

-- --- Un texte unique pour toutes les IA --------------------------------
--
-- Le catalogue V2 ne distingue plus les moteurs : une commande porte un
-- texte, et les trois IA recoivent le meme. Cela ne demande aucun schema
-- nouveau — le meme texte est simplement pose sur les trois variantes.
--
-- Un fournisseur « universel » aurait ete plus elegant sur le papier. Il
-- etait surtout piegeux : les lots du catalogue creent leurs variantes par
-- `cross join public.ai_providers`, sans filtre. Une quatrieme ligne dans
-- cette table fabrique aussitot des centaines de variantes vides.
--
-- Ce que la base garantit, elle, c'est qu'un texte vide ne se copie pas :
-- voir `payload_ready` ci-dessus et le controle 6 de `resolve_prompt`.
