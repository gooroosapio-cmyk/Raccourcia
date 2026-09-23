-- =====================================================================
-- Le regime des champs a remplir
--
-- La borne etait « trois au plus », ecrite une fois pour toutes. Le
-- catalogue V5 en ramene une deuxieme : un support marketing demande deux
-- a quatre informations — une affiche sans son titre, son offre et son
-- contact ne produit rien d'utilisable — la ou une carte ordinaire en
-- demande zero a trois.
--
-- On pourrait relever le plafond a quatre pour tout le monde. Ce serait
-- perdre la discipline : rien n'empecherait alors une carte ordinaire de
-- reclamer quatre saisies avant la copie, ce que la borne existait
-- justement pour eviter.
--
-- Le regime est donc inscrit sur la carte, et la borne en depend. Une
-- carte sans regime declare reste sous l'ancienne regle : les 2877 cartes
-- deja en base ne bougent pas.
-- =====================================================================

alter table public.prompts
  add column if not exists regime_champs text;

alter table public.prompts
  drop constraint if exists prompts_regime_champs_check;

alter table public.prompts
  add constraint prompts_regime_champs_check
  check (regime_champs is null or regime_champs in ('standard', 'marketing'));

alter table public.prompts
  drop constraint if exists prompts_fiche_champs_max_check;

alter table public.prompts
  add constraint prompts_fiche_champs_max_check
  check (
    fiche_champs_max is null
    or (coalesce(regime_champs, 'standard') = 'standard'
        and fiche_champs_max between 0 and 3)
    or (regime_champs = 'marketing'
        and fiche_champs_max between 2 and 4)
  );

comment on column public.prompts.regime_champs is
  'Regime de personnalisation : « standard » (0 a 3 champs) ou « marketing » '
  '(2 a 4). Nul vaut standard. La borne du nombre de champs en depend, pour '
  'qu''un support marketing puisse demander quatre informations sans ouvrir '
  'la meme latitude a toutes les cartes.';

-- La meme borne vit sur la position du champ, posee en septembre : un
-- formulaire a trois lignes numerotees de 1 a 3. Le regime marketing en
-- ajoute une quatrieme, et c'est la position qui la porte.
--
-- La contrainte de colonne est anonyme a l'origine (`check (position
-- between 1 and 3)`), donc sans nom sur lequel taper. On la retrouve par
-- son expression plutot que de deviner un nom genere.
do $$
declare
  v_nom text;
begin
  select con.conname into v_nom
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'prompt_fields'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%position%between 1 and 3%';

  if v_nom is not null then
    execute format('alter table public.prompt_fields drop constraint %I', v_nom);
  end if;
end $$;

alter table public.prompt_fields
  drop constraint if exists prompt_fields_position_check;

alter table public.prompt_fields
  add constraint prompt_fields_position_check
  check (position between 1 and 4);

comment on constraint prompt_fields_position_check on public.prompt_fields is
  'Quatre positions au plus. La borne reelle du nombre de champs vit sur la '
  'carte, dans prompts.regime_champs : trois en standard, quatre en marketing.';
