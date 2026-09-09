-- =====================================================================
-- RaccourcIA - Ordre du catalogue et copie des raccourcis offerts
--
-- Deux corrections qui touchent la meme chose : ce qu'un visiteur peut
-- voir et faire avant d'avoir paye.
--
-- 1. L'ordre. Les cartes sans visuel etaient regroupees sous un titre a
--    part ; elles descendent maintenant simplement en queue de liste, ce
--    qui evite d'annoncer un manque au lieu de le ranger. L'ordre devient
--    donc, pour tout le monde : visuel present, puis etoile
--    d'administration, puis nouveaute, puis l'ordre editorial.
--
--    Le tri « offerts d'abord » pour les visiteurs disparait : il
--    remplissait le premier ecran de cinq raccourcis et repoussait tout
--    le reste du catalogue derriere une pagination que personne
--    n'atteignait. Un visiteur doit voir ce qu'il achete.
--
-- 2. La copie. `resolve_prompt` exige une session Supabase, y compris
--    pour les raccourcis offerts : un visiteur qui touchait « Copier »
--    recevait « Reconnectez-vous pour continuer ». Le palier d'essai ne
--    servait donc a rien, et un lien partage sur WhatsApp ne menait a
--    aucune demonstration.
--
--    `resolve_free_prompt` ouvre cette porte, et elle seule : la fonction
--    refuse tout raccourci qui n'est pas `is_free`. Elle ne remplace pas
--    `resolve_prompt`, qui garde ses controles de session, d'appareil et
--    de droit pour tout le reste du catalogue.
-- =====================================================================

-- --- Index de tri --------------------------------------------------------
create index if not exists prompts_ordre_visuel_idx
  on public.prompts (mode, status, media_ready desc, is_pinned desc, is_new desc, is_featured desc, sort_order);

-- L'ancien index portait les memes colonnes dans un ordre que plus aucune
-- requete ne demande. Le garder ferait payer deux ecritures a chaque
-- publication pour un index que le planificateur n'ouvrirait jamais.
drop index if exists public.prompts_ordre_catalogue_idx;

-- Le tri se fait sur ces colonnes : PostgREST exige le droit de lecture
-- sur toute colonne nommee dans `order`.
grant select (is_new) on table public.prompts to anon, authenticated;

-- --- Copie d'un raccourci offert, sans compte ----------------------------
create or replace function public.resolve_free_prompt(
  p_prompt_id uuid,
  p_provider_key text,
  p_surface text default 'detail'
)
returns table (command text, payload text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prompt public.prompts%rowtype;
  v_variant_id uuid;
  v_version public.prompt_versions%rowtype;
begin
  -- Raccourci offert, publie, dans une categorie visible. Les trois
  -- conditions sont dans la meme requete : un raccourci absent et un
  -- raccourci reserve doivent renvoyer la meme erreur, faute de quoi le
  -- refus dirait ce que le catalogue contient.
  select * into v_prompt
  from public.prompts p
  where p.id = p_prompt_id
    and p.is_free
    and p.status = 'published'
    and exists (
      select 1 from public.categories c where c.id = p.category_id and c.is_visible
    );

  if not found then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  select v.id into v_variant_id
  from public.prompt_variants v
  join public.ai_providers pr on pr.id = v.provider_id
  where v.prompt_id = v_prompt.id
    and pr.key = p_provider_key
    and pr.is_active
    and v.status = 'published';

  if v_variant_id is null then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  select * into v_version
  from public.prompt_versions pv
  where pv.variant_id = v_variant_id
    and pv.is_current
    and pv.status = 'published';

  if not found then
    raise exception 'NOT_AVAILABLE' using errcode = '42501';
  end if;

  -- Journalisation d'usage. `user_id` reste nul pour un visiteur : la
  -- colonne l'accepte, et inventer un identifiant ferait passer une copie
  -- anonyme pour l'activite d'un compte.
  insert into public.copy_events (
    user_id, prompt_id, variant_id, version_id, provider_key, surface
  )
  values ((select auth.uid()), v_prompt.id, v_variant_id, v_version.id, p_provider_key, p_surface);

  return query select v_prompt.command::text, v_version.payload;
end;
$$;

revoke all on function public.resolve_free_prompt(uuid, text, text) from public;
grant execute on function public.resolve_free_prompt(uuid, text, text) to anon, authenticated;
