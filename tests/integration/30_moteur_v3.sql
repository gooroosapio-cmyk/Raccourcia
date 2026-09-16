-- =====================================================================
-- Le moteur V3 : chaque commande a son texte, et le bon.
--
-- Le catalogue V2 avait apporte 692 cartes sans matiere : 615 d'entre elles
-- etaient publiees et inutilisables — on les regardait, on ne pouvait rien
-- en copier. Ce lot pose les trois variantes, les 2 076 payloads et les sept
-- champs du moteur.
--
-- Ces controles ne valent que lorsque le lot est applique : la suite tourne
-- aussi sur des bases qui ne l'ont pas.
-- =====================================================================

\set ON_ERROR_STOP on

do $moteur$
declare
  v_n integer;
  v_empreinte text;
begin
  if not tests_moteur_v3_applique() then
    raise notice 'Moteur V3 absent : controles ignores.';
    return;
  end if;

  -- --- Ce qui doit etre la ----------------------------------------------

  select count(*) into v_n
  from public.prompt_versions where version_label = 'moteur-v3' and is_current;
  if v_n <> 2076 then
    raise exception 'Moteur V3 : % payloads courants au lieu de 2076.', v_n;
  end if;

  -- Trois variantes par carte, pas une de plus : un moteur ajoute en base
  -- fabriquerait des variantes orphelines sans texte.
  select count(*) into v_n
  from public.prompts p
  where p.catalog_v2
    and (select count(*) from public.prompt_variants v where v.prompt_id = p.id) <> 3;
  if v_n <> 0 then
    raise exception 'Moteur V3 : % cartes n ont pas exactement trois variantes.', v_n;
  end if;

  -- Plus une seule carte publiee sans texte a copier.
  select count(*) into v_n
  from public.prompts
  where catalog_v2 and status = 'published' and not payload_ready;
  if v_n <> 0 then
    raise exception 'Moteur V3 : % cartes publiees sans texte a copier.', v_n;
  end if;

  -- Les sept champs du moteur sont renseignes.
  select count(*) into v_n
  from public.prompts
  where catalog_v2
    and (specification is null or livrables is null or questions_cadrage is null);
  if v_n <> 0 then
    raise exception 'Moteur V3 : % cartes sans specification, livrables ou cadrage.', v_n;
  end if;

  -- --- Le bon texte au bon moteur ---------------------------------------
  --
  -- Les comptes passeraient encore si le texte ecrit pour ChatGPT etait servi
  -- a Gemini. L'empreinte porte sur (carte, moteur, empreinte du texte),
  -- triee, et vaut la meme chose que celle calculee sur le classeur source.
  select md5(string_agg(p.card_id || '|' || pr.key || '|' ||
                        encode(extensions.digest(convert_to(pv.payload, 'UTF8'), 'sha256'), 'hex'),
                        ',' order by p.card_id collate "C", pr.key collate "C"))
    into v_empreinte
  from public.prompt_versions pv
  join public.prompt_variants v on v.id = pv.variant_id
  join public.ai_providers pr on pr.id = v.provider_id
  join public.prompts p on p.id = v.prompt_id
  where pv.version_label = 'moteur-v3' and pv.is_current;

  if v_empreinte is distinct from '0dfcc2ebd9c5e00698d6d4022c855d45' then
    raise exception 'Moteur V3 : les payloads ne sont pas ceux du classeur (empreinte %).', v_empreinte;
  end if;

  -- --- Ce que le lot ne doit pas avoir touche ----------------------------
  --
  -- Le classeur porte encore la taxonomie d'avant le rangement des rayons.
  -- Si son titre ou sa collection etaient entres, « Star Afrobeats »
  -- redeviendrait « Vedette Afrobeats », au cinema.
  select count(*) into v_n
  from public.prompts
  where card_id = 'img-afrobeatsstar' and name = 'Star Afrobeats';
  if v_n <> 1 then
    raise exception 'Moteur V3 : le lot a ecrase le titre range.';
  end if;

  -- Le texte reste ferme au navigateur.
  select count(*) into v_n
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'prompt_versions'
    and grantee in ('anon', 'authenticated') and privilege_type = 'SELECT';
  if v_n <> 0 then
    raise exception 'Moteur V3 : % droits de lecture client sur prompt_versions.', v_n;
  end if;

  -- Les sept champs de la fiche, eux, doivent etre lisibles : la fiche d'un
  -- Mode IA et celle d'un Parcours n'affichent plus rien d'autre. Le droit
  -- porte sur ces colonnes seulement, jamais sur la table entiere -- c'est
  -- ce qui separe la description du raccourci de son contenu.
  select count(*) into v_n
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'prompts'
    and grantee = 'anon' and privilege_type = 'SELECT'
    and column_name in (
      'contexte', 'specification', 'livrables', 'questions_cadrage',
      'criteres_reussite', 'erreurs', 'regle_sortie'
    );
  if v_n <> 7 then
    raise exception 'Moteur V3 : % colonnes de fiche lisibles sur 7 attendues.', v_n;
  end if;

  raise notice 'Moteur V3 : verifie.';
end $moteur$;
