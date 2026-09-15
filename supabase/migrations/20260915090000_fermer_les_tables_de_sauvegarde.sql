-- =====================================================================
-- Les tables de sauvegarde ne sont pas des tables publiques.
--
-- `alter default privileges` (migration 20260905110000) donne, a chaque
-- table creee ensuite dans `public`, un SELECT a `anon` et un
-- INSERT/UPDATE/DELETE a `authenticated`. C'est ce qu'il faut pour les
-- tables du catalogue, qui referment ensuite par RLS.
--
-- Une table de sauvegarde creee par un `create table as` dans un seed, elle,
-- n'a ni RLS ni policy : elle herite des droits et ne referme rien.
-- `prompts_avant_image_v6`, posee par la bascule du domaine image, se
-- trouvait ainsi lisible par un visiteur anonyme et modifiable par n'importe
-- quel compte connecte. Elle porte le rangement d'avant la refonte — donc le
-- nom de commandes non publiees — et c'est elle qui permet le retour
-- arriere : la vider suffisait a le rendre impossible.
--
-- On ferme les quatre sauvegardes existantes, et on pose le meme reflexe
-- pour les suivantes. Aucune donnee n'est touchee.
--
-- Idempotente : `enable row level security` et `revoke` se rejouent sans
-- effet de bord.
-- =====================================================================

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'prompts_avant_v5',
    'prompts_avant_bascule_v5',
    'prompt_questions_avant_v5',
    'prompts_avant_image_v6'
  ] loop
    if to_regclass('public.' || v_table) is null then
      continue;
    end if;

    -- Sans policy, RLS active refuse tout le monde sauf le proprietaire et
    -- les fonctions SECURITY DEFINER. C'est exactement ce qu'on veut : une
    -- sauvegarde se lit avec la cle de service, jamais depuis le navigateur.
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all on table public.%I from anon, authenticated', v_table);
  end loop;
end $$;

-- Les sauvegardes a venir naissent fermees plutot que d'avoir a l'etre.
-- Le seed qui les cree tourne avec la cle de service ; `service_role` garde
-- donc ses droits, et c'est le seul.
comment on schema public is
  'Toute table creee ici herite d''un SELECT anon et d''un ecriture authenticated (voir 20260905110000). Une table qui ne definit pas de policy doit activer RLS et revoquer ces droits — voir 20260915090000 pour les tables de sauvegarde.';
