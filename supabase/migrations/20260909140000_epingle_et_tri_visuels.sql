-- =====================================================================
-- RaccourcIA - Epinglage administrateur et tri par visuel
--
-- Deux besoins de tri que le frontend ne peut pas satisfaire seul.
--
-- 1. Les cartes sans visuel doivent fermer la marche DANS CHAQUE
--    categorie. Trier la page chargee ne suffisait pas : une carte sans
--    image du premier lot passait devant une carte illustree du second.
--    Un ordre qui ne vaut que sur vingt elements n'est pas un ordre.
--
-- 2. L'administration doit pouvoir remonter un raccourci en tete.
--    `is_featured` ne pouvait pas servir : le classeur V3 l'a pose sur
--    142 raccourcis, une mise en avant choisie s'y noierait.
--
-- Les deux colonnes sont maintenues par la base et non par l'appelant :
-- `media_ready` par declencheur sur les medias, faute de quoi elle dirait
-- un jour le contraire de la table qu'elle resume.
-- =====================================================================

-- --- Epinglage ----------------------------------------------------------
alter table public.prompts
  add column if not exists is_pinned boolean not null default false;

comment on column public.prompts.is_pinned is
  'Remonte le raccourci en tete de sa categorie. Decision d''administration, invisible comme telle cote membre : seul l''ordre change.';

-- --- Carte prete a se montrer -------------------------------------------
-- Vrai quand la carte a de quoi s'afficher : une commande texte n'attend
-- aucune image, une commande image attend son visuel de resultat.
alter table public.prompts
  add column if not exists media_ready boolean not null default false;

comment on column public.prompts.media_ready is
  'La carte a de quoi se montrer : toujours vrai pour une commande texte, vrai pour une commande image des qu''elle a un visuel de resultat.';

create or replace function public.prompt_media_ready(p_prompt_id uuid, p_carte_visuelle boolean)
returns boolean
language sql
stable
set search_path = ''
as $$
  select not p_carte_visuelle or exists (
    select 1 from public.prompt_media m
    where m.prompt_id = p_prompt_id and m.kind in ('after', 'thumbnail')
  )
$$;

-- Recalcule la colonne pour un raccourci donne.
create or replace function public.prompt_media_ready_refresh(p_prompt_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.prompts p
     set media_ready = public.prompt_media_ready(p.id, p.show_image_card)
   where p.id = p_prompt_id
     and p.media_ready is distinct from public.prompt_media_ready(p.id, p.show_image_card);
$$;

-- Deux declencheurs et deux corps : `new` porte le type de sa table, et
-- PL/pgSQL resout les champs a la preparation. Un corps unique qui lirait
-- `new.prompt_id` d'un cote et `new.id` de l'autre echoue des la premiere
-- ligne inseree, meme sur la branche non prise.
create or replace function public.prompt_media_apres_ecriture()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.prompt_media_ready_refresh(coalesce(new.prompt_id, old.prompt_id));
  return null;
end;
$$;

create or replace function public.prompts_apres_bascule_carte()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.prompt_media_ready_refresh(new.id);
  return null;
end;
$$;

drop trigger if exists prompt_media_refresh_ready on public.prompt_media;
create trigger prompt_media_refresh_ready
  after insert or delete or update of prompt_id, kind on public.prompt_media
  for each row execute function public.prompt_media_apres_ecriture();

-- Basculer « carte avec visuel » change la reponse sans toucher aux medias.
drop trigger if exists prompts_refresh_media_ready on public.prompts;
create trigger prompts_refresh_media_ready
  after insert or update of show_image_card on public.prompts
  for each row execute function public.prompts_apres_bascule_carte();

-- Remplissage des lignes existantes.
update public.prompts p
   set media_ready = public.prompt_media_ready(p.id, p.show_image_card)
 where p.media_ready is distinct from public.prompt_media_ready(p.id, p.show_image_card);

-- --- Index de tri --------------------------------------------------------
-- L'ordre reel du catalogue, dans l'ordre ou il est demande.
create index if not exists prompts_ordre_catalogue_idx
  on public.prompts (mode, status, is_pinned desc, media_ready desc, is_featured desc, sort_order);

-- --- Droits --------------------------------------------------------------
-- Lecture publique : les deux colonnes ne disent que l'ordre d'affichage,
-- que la liste rendue montre deja. Aucune ecriture cote client : seule la
-- fonction d'administration ci-dessous les modifie.
grant select (is_pinned) on table public.prompts to anon, authenticated;
grant select (media_ready) on table public.prompts to anon, authenticated;

revoke all on function public.prompt_media_ready(uuid, boolean) from public;
revoke all on function public.prompt_media_ready_refresh(uuid) from public, anon, authenticated;
revoke all on function public.prompt_media_apres_ecriture() from public, anon, authenticated;
revoke all on function public.prompts_apres_bascule_carte() from public, anon, authenticated;

-- --- Epingler depuis l'administration -----------------------------------
create or replace function public.admin_set_prompt_pinned(p_prompt_id uuid, p_pinned boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using hint = 'Role administrateur requis.';
  end if;

  update public.prompts set is_pinned = p_pinned, updated_at = now() where id = p_prompt_id;

  if not found then
    raise exception 'NOT_FOUND' using hint = 'Raccourci introuvable.';
  end if;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, payload)
  values (auth.uid(), case when p_pinned then 'prompt_pinned' else 'prompt_unpinned' end,
          'prompt', p_prompt_id, jsonb_build_object('is_pinned', p_pinned));
end;
$$;

revoke all on function public.admin_set_prompt_pinned(uuid, boolean) from public, anon;
grant execute on function public.admin_set_prompt_pinned(uuid, boolean) to authenticated;
