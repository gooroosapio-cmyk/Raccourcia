-- =====================================================================
-- Actions groupees de l'administration
--
-- A quelques centaines de raccourcis, publier un par un tient encore. A
-- plusieurs milliers, c'est la seule chose qui empeche de travailler : une
-- vague d'import arrive en brouillon, et il faut cinquante clics pour la
-- mettre en ligne.
--
-- Deux fonctions, une par geste. Elles reprennent exactement les controles
-- des fonctions unitaires — c'est le meme appel, repete — et ne les
-- contournent jamais : publier passe toujours par `admin_publish_prompt` et
-- ses controles de qualite.
--
-- ECHEC PARTIEL PLUTOT QU'ECHEC TOTAL. Un lot ou une seule commande est
-- refusee ne doit pas laisser les quarante-neuf autres au brouillon. Chaque
-- ligne est donc traitee dans son propre bloc : ce qui passe est applique,
-- ce qui echoue est rapporte avec son motif. Une action qui ne dirait que
-- « erreur » obligerait a rouvrir les cinquante pour trouver laquelle.
--
-- Le plafond est une securite, pas une regle produit : une requete qui
-- arriverait avec dix mille identifiants tiendrait la connexion pendant des
-- minutes, et personne ne coche dix mille cases a la main.
-- =====================================================================

create or replace function public.admin_set_prompts_status(
  p_prompt_ids uuid[],
  p_status public.content_status
)
returns table (traites integer, refuses integer, motifs text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_traites integer := 0;
  v_refuses integer := 0;
  v_motifs text[] := array[]::text[];
  v_motif text;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_prompt_ids is null or array_length(p_prompt_ids, 1) is null then
    return query select 0, 0, array[]::text[];
    return;
  end if;

  if array_length(p_prompt_ids, 1) > 200 then
    raise exception 'TROP_DE_RACCOURCIS' using errcode = '22023';
  end if;

  foreach v_id in array p_prompt_ids loop
    begin
      perform public.admin_set_prompt_status(v_id, p_status);
      v_traites := v_traites + 1;
    exception
      when others then
        v_refuses := v_refuses + 1;
        -- Le motif est conserve une seule fois : cinquante commandes
        -- refusees pour la meme raison tiennent en une ligne.
        v_motif := sqlerrm;
        if not (v_motif = any (v_motifs)) then
          v_motifs := array_append(v_motifs, v_motif);
        end if;
    end;
  end loop;

  return query select v_traites, v_refuses, v_motifs;
end;
$$;

revoke all on function public.admin_set_prompts_status(uuid[], public.content_status)
  from public, anon;
grant execute on function public.admin_set_prompts_status(uuid[], public.content_status)
  to authenticated;

create or replace function public.admin_set_prompts_free(
  p_prompt_ids uuid[],
  p_free boolean
)
returns table (traites integer, refuses integer, motifs text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_traites integer := 0;
  v_refuses integer := 0;
  v_motifs text[] := array[]::text[];
  v_motif text;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_prompt_ids is null or array_length(p_prompt_ids, 1) is null then
    return query select 0, 0, array[]::text[];
    return;
  end if;

  if array_length(p_prompt_ids, 1) > 200 then
    raise exception 'TROP_DE_RACCOURCIS' using errcode = '22023';
  end if;

  foreach v_id in array p_prompt_ids loop
    begin
      perform public.admin_set_prompt_free(v_id, p_free);
      v_traites := v_traites + 1;
    exception
      when others then
        v_refuses := v_refuses + 1;
        v_motif := sqlerrm;
        if not (v_motif = any (v_motifs)) then
          v_motifs := array_append(v_motifs, v_motif);
        end if;
    end;
  end loop;

  return query select v_traites, v_refuses, v_motifs;
end;
$$;

revoke all on function public.admin_set_prompts_free(uuid[], boolean) from public, anon;
grant execute on function public.admin_set_prompts_free(uuid[], boolean) to authenticated;
