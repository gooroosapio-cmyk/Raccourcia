-- =====================================================================
-- RaccourcIA - 07. Row Level Security
-- Toute table exposee au client a RLS activee. Le middleware Next.js
-- ameliore l'experience, il ne remplace jamais cette couche.
--
-- Regle centrale : prompt_versions n'a AUCUNE policy de lecture pour anon
-- ni authenticated. Le payload premium ne sort que par /api/resolve-prompt,
-- apres verification session + app_session + entitlement + statuts.
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.app_sessions enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.entitlements enable row level security;
alter table public.webhook_events enable row level security;
alter table public.categories enable row level security;
alter table public.ai_providers enable row level security;
alter table public.prompts enable row level security;
alter table public.prompt_variants enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.prompt_media enable row level security;
alter table public.favorites enable row level security;
alter table public.copy_events enable row level security;
alter table public.recent_items enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.security_events enable row level security;
alter table public.rate_limit_counters enable row level security;
alter table public.app_config enable row level security;

-- --- Identite -------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles_admin_all" on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "roles_read" on public.roles
  for select to authenticated using (true);

-- Un role ne s'attribue jamais depuis l'interface : seul un super_admin ecrit.
create policy "user_roles_select_own" on public.user_roles
  for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "user_roles_super_admin_write" on public.user_roles
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "app_sessions_select_own" on public.app_sessions
  for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

-- L'utilisateur peut revoquer ses propres sessions depuis Compte > Mes appareils.
create policy "app_sessions_update_own" on public.app_sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- --- Commerce -------------------------------------------------------------
create policy "products_read_active" on public.products
  for select to anon, authenticated
  using (is_active or public.is_admin());

create policy "products_admin_write" on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "purchases_select_own" on public.purchases
  for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "purchases_admin_write" on public.purchases
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "entitlements_select_own" on public.entitlements
  for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "entitlements_admin_write" on public.entitlements
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- webhook_events : lecture technique limitee aux admins, aucune ecriture
-- client. Le webhook ecrit via service_role, qui contourne la RLS.
create policy "webhook_events_admin_read" on public.webhook_events
  for select to authenticated
  using (public.is_admin());

-- --- Catalogue ------------------------------------------------------------
-- Une categorie non publiee, ou dont la categorie parente ne l'est pas,
-- devient invisible ainsi que tous ses prompts enfants.
create policy "categories_read_visible" on public.categories
  for select to anon, authenticated
  using (is_visible or public.is_admin());

create policy "categories_admin_write" on public.categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "ai_providers_read" on public.ai_providers
  for select to anon, authenticated
  using (is_active or public.is_admin());

create policy "ai_providers_admin_write" on public.ai_providers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Metadonnees publiques : commande, titre, description, cas d'usage, tags.
-- Le payload n'est pas dans cette table.
create policy "prompts_read_published" on public.prompts
  for select to anon, authenticated
  using (
    public.is_admin()
    or (
      status = 'published'
      and exists (
        select 1 from public.categories c
        where c.id = prompts.category_id and c.is_visible
      )
    )
  );

create policy "prompts_admin_write" on public.prompts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Les variantes exposent la compatibilite affichee, jamais le contenu.
create policy "prompt_variants_read_published" on public.prompt_variants
  for select to anon, authenticated
  using (
    public.is_admin()
    or (
      status = 'published'
      and exists (
        select 1 from public.prompts p
        where p.id = prompt_variants.prompt_id
          and p.status = 'published'
          and exists (
            select 1 from public.categories c
            where c.id = p.category_id and c.is_visible
          )
      )
    )
  );

create policy "prompt_variants_admin_write" on public.prompt_variants
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- prompt_versions : AUCUNE policy pour anon ni authenticated.
-- RLS active sans policy = refus total. Seuls les admins lisent et ecrivent ;
-- la resolution passe par le serveur.
create policy "prompt_versions_admin_all" on public.prompt_versions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Ceinture et bretelles : meme si une policy etait ajoutee par erreur,
-- le privilege SQL manque aux roles clients.
revoke all on table public.prompt_versions from anon;
revoke select, insert, update, delete on table public.prompt_versions from authenticated;
grant select, insert, update, delete on table public.prompt_versions to service_role;

create policy "prompt_media_read_published" on public.prompt_media
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.prompts p
      where p.id = prompt_media.prompt_id
        and p.status = 'published'
        and exists (
          select 1 from public.categories c
          where c.id = p.category_id and c.is_visible
        )
    )
  );

create policy "prompt_media_admin_write" on public.prompt_media
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --- Usage personnel -------------------------------------------------------
create policy "favorites_own_all" on public.favorites
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Un membre n'inscrit que ses propres copies et ne relit pas celles des autres.
create policy "copy_events_insert_own" on public.copy_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "copy_events_select_own" on public.copy_events
  for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "recent_items_own_all" on public.recent_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- --- Gouvernance -----------------------------------------------------------
create policy "admin_audit_logs_admin_read" on public.admin_audit_logs
  for select to authenticated
  using (public.is_admin());

create policy "security_events_super_admin_read" on public.security_events
  for select to authenticated
  using (public.is_super_admin());

-- rate_limit_counters : aucune policy. Ecriture par fonction SECURITY DEFINER
-- ou service_role uniquement.
revoke all on table public.rate_limit_counters from anon, authenticated;

-- Seules les cles marquees publiques sont lisibles par le navigateur.
create policy "app_config_read_public" on public.app_config
  for select to anon, authenticated
  using (is_public or public.is_admin());

create policy "app_config_admin_write" on public.app_config
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
