#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Repetition du retrait des « j'aime » et des rayons epingles.
#
# Applique les migrations jusqu'a la veille du retrait, pose des « j'aime »
# et des epingles comme en production (autant que les fixtures le
# permettent), puis applique le retrait
# deux fois : la sauvegarde doit porter chaque ligne, la seconde passe ne
# rien refaire ni lever.
#
#   ./tests/db/repetition-retrait-jaime.sh
# ---------------------------------------------------------------------------
set -euo pipefail

PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKDIR="${PGTEST_DIR:-/tmp/raccourcia-jaime}"
DATA_DIR="$WORKDIR/data"; SOCKET_DIR="$WORKDIR/socket"; DB_NAME="raccourcia_jaime"

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

RETRAIT="$ROOT/supabase/migrations/20260924120000_retrait_jaime_et_rayons_epingles.sql"

echo "==> Migrations jusqu'a la veille du retrait"
run "${PSQL[@]}" >/dev/null < "$ROOT/tests/db/supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  [[ "$f" == "$RETRAIT" ]] && break
  run "${PSQL[@]}" >/dev/null < "$f"
done
run "${PSQL[@]}" >/dev/null < "$ROOT/tests/db/fixtures.sql"

echo "==> Etat de production reproduit"
run "${PSQL[@]}" -c "
insert into public.prompt_likes (prompt_id, user_id)
select id, '00000000-0000-0000-0000-0000000000a1' from public.prompts limit 29;
insert into public.tag_favorites (user_id, tag_id)
select '00000000-0000-0000-0000-0000000000a1', id from public.tags limit 2;
create table public.avant_retrait as
select (select count(*) from public.prompt_likes) as jaime,
       (select count(*) from public.prompts where like_count > 0) as compteurs,
       (select count(*) from public.tag_favorites) as tags_epingles;
select (select count(*) from public.prompt_likes) as jaime,
       (select count(*) from public.prompts where like_count > 0) as compteurs,
       (select count(*) from public.tag_favorites) as tags_epingles;"

for passe in 1 2; do
  echo "==> Passe $passe du retrait"
  run "${PSQL[@]}" < "$RETRAIT"
done

echo "==> Controles"
run "${PSQL[@]}" -c "
do \$verif\$
begin
  if (select count(*) from sauvegarde.prompt_likes_20260924) <> (select jaime from public.avant_retrait)
     or (select count(*) from sauvegarde.prompts_like_count_20260924) <> (select compteurs from public.avant_retrait)
     or (select count(*) from sauvegarde.tag_favorites_20260924) <> (select tags_epingles from public.avant_retrait)
     or (select jaime from public.avant_retrait) = 0 then
    raise exception 'Sauvegarde incomplete.';
  end if;
  if to_regclass('public.prompt_likes') is not null then
    raise exception 'La table des j aime existe encore.';
  end if;
  raise notice 'Retrait : sauvegarde complete, deux passes sans erreur.';
end \$verif\$;"
