-- =====================================================================
-- RaccourcIA - 25. Hygiene des sessions applicatives
--
-- `app_sessions` sert de journal des appareils connectes, et
-- `current_app_session_is_active()` s'en sert comme d'un verrou : la copie
-- d'une commande exige une session applicative active.
--
-- Or rien ne fermait jamais une ligne. Une session Auth detruite — par une
-- deconnexion, par une expiration — laissait sa ligne « active » pour
-- toujours. La production comptait ainsi soixante sessions actives pour trois
-- comptes et deux sessions Auth reelles : le journal ne decrivait plus rien,
-- et la limite d'appareils du produit, si elle avait ete appliquee, aurait
-- bloque tout le monde des le premier jour.
--
-- Deux fonctions repondent a cela, sans nouvelle table ni nouvelle colonne :
-- l'enregistrement referme au passage les lignes orphelines du compte, et la
-- deconnexion referme la sienne.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enregistrement d'un appareil, qui referme au passage les lignes mortes
--
-- Une ligne est morte quand sa session Auth n'existe plus : le porteur ne
-- peut plus obtenir de jeton pour elle, l'appareil n'est donc plus connecte.
-- Le nettoyage vit ici plutot que dans une tache planifiee : il se declenche
-- exactement quand le compte concerne revient, et ne coute qu'une jointure
-- sur ses propres lignes.
-- ---------------------------------------------------------------------
create or replace function public.register_app_session(p_device_label text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session_id uuid := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;
  v_active integer;
begin
  if v_user_id is null or v_session_id is null then
    return 0;
  end if;

  insert into public.app_sessions (user_id, auth_session_id, device_label)
  values (v_user_id, v_session_id, p_device_label)
  on conflict (auth_session_id) do update
    set last_seen_at = now(),
        status = 'active',
        device_label = coalesce(excluded.device_label, public.app_sessions.device_label);

  -- Les appareils dont la session Auth a disparu sont refermes. La ligne
  -- courante est exclue explicitement : elle vient d'etre ecrite, et une
  -- lecture de `auth.sessions` dans la meme transaction n'est pas garantie.
  update public.app_sessions s
  set status = 'revoked',
      revoked_at = coalesce(s.revoked_at, now())
  where s.user_id = v_user_id
    and s.status = 'active'
    and s.auth_session_id <> v_session_id
    and not exists (
      select 1 from auth.sessions a where a.id = s.auth_session_id
    );

  select count(*) into v_active
  from public.app_sessions
  where user_id = v_user_id and status = 'active';

  return v_active;
end;
$$;

comment on function public.register_app_session(text) is
  'Enregistre l''appareil courant et referme les sessions dont le jeton Auth n''existe plus.';

-- ---------------------------------------------------------------------
-- Fermeture de la session courante, appelee a la deconnexion
--
-- Sans elle, se deconnecter laissait la ligne ouverte : l'appareil restait
-- compte comme connecte alors que son porteur venait justement de partir.
-- ---------------------------------------------------------------------
create or replace function public.revoke_current_app_session()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session_id uuid := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;
begin
  if v_user_id is null or v_session_id is null then
    return;
  end if;

  update public.app_sessions
  set status = 'revoked',
      revoked_at = now(),
      revoked_by = v_user_id
  where user_id = v_user_id
    and auth_session_id = v_session_id
    and status = 'active';
end;
$$;

comment on function public.revoke_current_app_session() is
  'Referme la session applicative de l''appareil courant, a la deconnexion.';

revoke all on function public.revoke_current_app_session() from public, anon;
grant execute on function public.revoke_current_app_session() to authenticated;
