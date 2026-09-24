#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Repetition de la mise en ligne de la refonte UI, puis de son retour arriere.
#
# Il n'y a pas de preproduction (decision de cadrage 1) : cette repetition
# en tient lieu. Sur un Postgres jetable, elle reconstitue l'etat actuel de
# la production (migrations jusqu'au 23 septembre, replica V5, « j'aime » et
# favoris), puis deroule exactement la sequence prevue :
#
#   1. migrations d'avant deploiement (payload unique, copie en deux temps) —
#      l'ANCIEN code doit continuer de fonctionner ;
#   2. lots payload-unique puis archiver-variantes-par-ia ;
#   3. migration d'apres deploiement (retrait des « j'aime ») ;
#   4. retour arriere complet (lot retour-arriere-refonte).
#
# Chaque etape passe deux fois, et chaque etape est controlee : ce qui est
# servi a chaque IA ne change pas d'un caractere, les favoris restent, et le
# retour arriere rend exactement ce qui avait ete retire.
#
#   ./tests/db/repetition-mise-en-ligne.sh
# ---------------------------------------------------------------------------
set -euo pipefail

PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKDIR="${PGTEST_DIR:-/tmp/raccourcia-mel}"
DATA_DIR="$WORKDIR/data"; SOCKET_DIR="$WORKDIR/socket"; DB_NAME="raccourcia_mel"

cleanup() { "$PG_BIN/pg_ctl" -D "$DATA_DIR" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORKDIR"; }
trap cleanup EXIT
rm -rf "$WORKDIR"; mkdir -p "$DATA_DIR" "$SOCKET_DIR"

RUNAS=""
if [[ "$(id -u)" -eq 0 ]]; then
  RUNAS="setpriv --reuid=postgres --regid=postgres --clear-groups"
  chown -R postgres:postgres "$WORKDIR"
fi
run() { if [[ -n "$RUNAS" ]]; then $RUNAS "$@"; else "$@"; fi }

run "$PG_BIN/initdb" -D "$DATA_DIR" -U postgres --auth=trust --no-sync >/dev/null
run "$PG_BIN/pg_ctl" -D "$DATA_DIR" -o "-k $SOCKET_DIR -h '' -c fsync=off" -w start >/dev/null
export PGHOST="$SOCKET_DIR" PGUSER=postgres
PSQL=("$PG_BIN/psql" -v ON_ERROR_STOP=1 -q --no-psqlrc -h "$SOCKET_DIR" -U postgres -d "$DB_NAME")
run "$PG_BIN/createdb" -h "$SOCKET_DIR" -U postgres "$DB_NAME"

echo "==> Socle"

MIGRATIONS="$ROOT/supabase/migrations"
AVANT_DEPLOIEMENT=("20260924090000_payload_unique.sql" "20260924110000_copie_en_deux_temps.sql")
APRES_DEPLOIEMENT="20260924120000_retrait_jaime_et_rayons_epingles.sql"
controle() { run "${PSQL[@]}" -c "$1"; }

echo "==> Etat actuel de la production"
run "${PSQL[@]}" >/dev/null < "$ROOT/tests/db/supabase_stub.sql"
for f in "$MIGRATIONS"/*.sql; do
  [[ "$(basename "$f")" > "20260924000000" ]] && continue
  run "${PSQL[@]}" >/dev/null < "$f"
done
run "${PSQL[@]}" >/dev/null < "$ROOT/tests/db/fixtures.sql"
run "${PSQL[@]}" >/dev/null < "$ROOT/tests/integration/00_helpers.sql"
run "${PSQL[@]}" >/dev/null < "$ROOT/tests/db/replica-v5.sql"
for f in "$ROOT"/supabase/seed/catalogue-final-v5/*.sql; do run "${PSQL[@]}" >/dev/null < "$f"; done

# Ce qu'il y a a garder : des « j'aime », des favoris, un tag epingle —
# poses par le membre a1, comme en production par un seul membre.
controle "
insert into public.prompt_likes (prompt_id, user_id)
select id, '00000000-0000-0000-0000-0000000000a1' from public.prompts
where catalog_version = 'v5' and status = 'published' order by id limit 29;
insert into public.favorites (prompt_id, user_id)
select id, '00000000-0000-0000-0000-0000000000a1' from public.prompts
where catalog_version = 'v5' and status = 'published' order by id desc limit 23
on conflict do nothing;
insert into public.tag_favorites (user_id, tag_id)
select '00000000-0000-0000-0000-0000000000a1', id from public.tags order by id limit 2;
create table public.reference as
select p.id as prompt_id, a.key as ia, pv.payload
from public.prompts p
join public.prompt_variants v on v.prompt_id = p.id and v.status = 'published'
join public.ai_providers a on a.id = v.provider_id and a.is_active
join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
where p.catalog_version = 'v5';
create table public.reference_comptes as
select (select count(*) from public.prompt_likes) as jaime,
       (select coalesce(sum(like_count), 0) from public.prompts) as compteurs,
       (select count(*) from public.favorites) as favoris,
       (select count(*) from public.tag_favorites) as tags_epingles,
       (select count(*) from public.prompt_variants v join public.ai_providers a on a.id = v.provider_id
          where a.is_active and v.status = 'published') as variantes_ia;
select * from public.reference_comptes;" 

echo "==> 1. Migrations d'avant deploiement (x2)"
for passe in 1 2; do
  for m in "${AVANT_DEPLOIEMENT[@]}"; do run "${PSQL[@]}" >/dev/null < "$MIGRATIONS/$m"; done
done

# L'ancien code appelle resolve_prompt avec l'IA choisie, et lit les « j'aime ».
controle "
select tests_login('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1');
do \$v\$
declare v_ecarts integer := 0; r record; v_payload text;
begin
  for r in select * from public.reference where ia = 'chatgpt' limit 60 loop
    select payload into v_payload from public.resolve_prompt(r.prompt_id, 'chatgpt')
      where exists (select 1 from public.prompts where id = r.prompt_id and status = 'published');
    if v_payload is not null and v_payload is distinct from r.payload then v_ecarts := v_ecarts + 1; end if;
  end loop;
  if v_ecarts > 0 then raise exception 'Etape 1 : % texte(s) servis a l ancien code ont change.', v_ecarts; end if;
  perform count(*) from public.prompt_likes;
  raise notice 'Etape 1 : l ancien code lit le meme texte et les « j aime ».';
end \$v\$;
reset role;"

echo "==> 2. Lots payload-unique et archiver-variantes-par-ia (x2)"
for passe in 1 2; do
  for f in "$ROOT"/supabase/seed/payload-unique/*.sql "$ROOT"/supabase/seed/archiver-variantes-par-ia/*.sql; do
    run "${PSQL[@]}" >/dev/null < "$f"
  done
done

echo "==> 3. Migration d'apres deploiement (x2)"
for passe in 1 2; do run "${PSQL[@]}" >/dev/null < "$MIGRATIONS/$APRES_DEPLOIEMENT"; done

controle "
select tests_login('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1');
do \$v\$
declare v_ecarts integer := 0; v_vides integer := 0; r record; v_payload text; v_version uuid;
begin
  -- Le nouveau code lit par lire_prompt, sans IA : chaque carte publiee rend
  -- le texte qu'elle servait a ChatGPT (identique aux deux autres).
  for r in select ref.* from public.reference ref
           join public.prompts p on p.id = ref.prompt_id and p.status = 'published'
           where ref.ia = 'chatgpt' loop
    select payload, version_id into v_payload, v_version from public.lire_prompt(r.prompt_id, null);
    if coalesce(v_payload, '') = '' then v_vides := v_vides + 1;
    elsif v_payload <> r.payload then v_ecarts := v_ecarts + 1; end if;
  end loop;
  if v_vides > 0 or v_ecarts > 0 then
    raise exception 'Etape 3 : % carte(s) sans texte, % texte(s) change(s).', v_vides, v_ecarts;
  end if;
  if not public.enregistrer_copie(r.prompt_id, v_version, null, 'detail') then
    raise exception 'Etape 3 : la copie n a pas ete inscrite.';
  end if;
  raise notice 'Etape 3 : toutes les cartes publiees servent leur texte ; la copie s inscrit.';
end \$v\$;
reset role;
do \$v\$
declare v_ref record;
begin
  select * into v_ref from public.reference_comptes;
  if (select count(*) from public.favorites) <> v_ref.favoris then raise exception 'Etape 3 : des favoris ont disparu.'; end if;
  if to_regclass('public.prompt_likes') is not null then raise exception 'Etape 3 : les « j aime » sont encore la.'; end if;
  if (select count(*) from sauvegarde.prompt_likes_20260924) <> v_ref.jaime then raise exception 'Etape 3 : sauvegarde des « j aime » incomplete.'; end if;
  raise notice 'Etape 3 : favoris intacts, « j aime » retires et sauvegardes.';
end \$v\$;"

echo "==> 4. Retour arriere complet (x2)"
for passe in 1 2; do
  for f in "$ROOT"/supabase/seed/retour-arriere-refonte/*.sql; do run "${PSQL[@]}" >/dev/null < "$f"; done
done

controle "
do \$v\$
declare v_ref record; v_ecarts integer;
begin
  select * into v_ref from public.reference_comptes;
  if (select count(*) from public.prompt_likes) <> v_ref.jaime then raise exception 'Retour : % « j aime » sur %.', (select count(*) from public.prompt_likes), v_ref.jaime; end if;
  if (select coalesce(sum(like_count), 0) from public.prompts) <> v_ref.compteurs then raise exception 'Retour : compteurs differents.'; end if;
  if (select count(*) from public.tag_favorites) <> v_ref.tags_epingles then raise exception 'Retour : tags epingles differents.'; end if;
  if (select count(*) from public.favorites) <> v_ref.favoris then raise exception 'Retour : favoris differents.'; end if;
  if (select count(*) from public.prompt_variants v join public.ai_providers a on a.id = v.provider_id
        where a.is_active and v.status = 'published') <> v_ref.variantes_ia then
    raise exception 'Retour : variantes par IA publiees differentes.';
  end if;
  raise notice 'Retour arriere : « j aime », compteurs, epingles, favoris et variantes par IA restaures a l identique.';
end \$v\$;"
controle "
select tests_login('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1');
do \$v\$
declare v_ecarts integer := 0; r record; v_payload text;
begin
  for r in select ref.* from public.reference ref
           join public.prompts p on p.id = ref.prompt_id and p.status = 'published' limit 90 loop
    select payload into v_payload from public.resolve_prompt(r.prompt_id, r.ia);
    if v_payload is distinct from r.payload then v_ecarts := v_ecarts + 1; end if;
  end loop;
  if v_ecarts > 0 then raise exception 'Retour : % texte(s) servis a l ancien code different(s).', v_ecarts; end if;
  raise notice 'Retour arriere : l ancien code lit le meme texte pour chaque IA.';
end \$v\$;
reset role;"
echo "==> Repetition terminee sans erreur"
