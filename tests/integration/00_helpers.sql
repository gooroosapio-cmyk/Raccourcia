-- Helpers de test partages : simulent le contexte d'une requete PostgREST.
create or replace function tests_assert(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not p_condition then
    raise exception 'ASSERTION ECHOUEE: %', p_message;
  end if;
end;
$$;

-- Simule un JWT : role Postgres + claims (sub, session_id).
create or replace function tests_login(p_user_id uuid, p_session_id uuid default null)
returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_user_id::text,
      'role', 'authenticated',
      'session_id', coalesce(p_session_id::text, '')
    )::text,
    true
  );
  execute 'set local role authenticated';
end;
$$;

create or replace function tests_logout()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end;
$$;

-- Le catalogue V2 remplace l'ancien : ce qui etait publie est archive, et
-- des commandes changent de domaine et de rayon. Plusieurs fichiers
-- decrivent l'etat que leur import avait produit — un etat qui appartient
-- desormais a l'histoire.
--
-- Ils gardent leurs controles d'integrite, qui portent sur des lignes
-- toujours en base : comptes d'import, questionnaires, empreintes de
-- payloads. Ils suspendent ceux qui parlent de la vitrine : ce qui est
-- publie, visible, ou range dans telle famille.
--
-- Suspendre et non supprimer : le jour ou l'on rejoue un import sans la
-- refonte V2, ces controles reprennent leur travail.
create or replace function tests_catalogue_v2_applique()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.prompts where catalog_v2 and status = 'published'
  )
$$;
